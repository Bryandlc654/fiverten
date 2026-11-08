import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { datasourceInfo } from './prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const db = datasourceInfo();
  logger.log(`Base de datos: ${db.source} · host ${db.host} · usuario ${db.user}`);
  // Sin bufferLogs: si falla la conexión con la base de datos (o cualquier
  // proveedor), los logs de arranque y el error real llegan a Render en vez de
  // perderse y dejar solo "Exited with status 1".
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 4000);
  await app.listen(port);
  logger.log(`FIVERTEN API escuchando en el puerto ${port}`);
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  const stack = error instanceof Error ? error.stack : String(error);
  logger.error('No se pudo iniciar la aplicación', stack);

  if (/authentication failed|denied access|P1000|P1010/i.test(stack ?? '')) {
    const db = datasourceInfo();
    logger.error(
      `La autenticación con la base de datos falló usando ${db.source} ` +
        `(host ${db.host}, usuario ${db.user}).`,
    );
    if (db.source === 'APP_DATABASE_URL') {
      logger.error(
        'Revisa APP_DATABASE_URL: la contraseña debe coincidir con APP_DB_PASSWORD y con la que ' +
          'se usó al crear el rol fiverten_app (npm run db:rls). Si el usuario no existe, ' +
          'vuelve a ejecutar la configuración de RLS.',
      );
    } else {
      logger.error('Revisa usuario y contraseña de DATABASE_URL en Render.');
    }
  } else if (
    error instanceof Error &&
    /can'?t reach database server|P1001|P1000|P1017|ECONNREFUSED|ENOTFOUND/i.test(stack ?? '')
  ) {
    const db = datasourceInfo();
    logger.error(
      `No se puede conectar con la base de datos usando ${db.source} (host ${db.host}). ` +
        'Revisa DATABASE_URL y APP_DATABASE_URL en Render: el host interno cambia si la base ' +
        'de datos se recrea o se mueve de región.',
    );
  }
  process.exit(1);
});

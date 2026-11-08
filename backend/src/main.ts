import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
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
  if (
    error instanceof Error &&
    /can'?t reach database server|P1001|P1000|P1017|ECONNREFUSED|ENOTFOUND/i.test(stack ?? '')
  ) {
    logger.error(
      'No se puede conectar con la base de datos. Revisa DATABASE_URL y APP_DATABASE_URL en Render: ' +
        'el host interno cambia si la base de datos se recrea o se mueve de región.',
    );
  }
  process.exit(1);
});

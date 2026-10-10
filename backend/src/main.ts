import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(new Logger());
  configureApp(app);

  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 4000);
  await app.listen(port);
  logger.log(`FIVERTEN API escuchando en el puerto ${port}`);
}

bootstrap().catch((error) => {
  new Logger('Bootstrap').error('No se pudo iniciar la aplicación', error as Error);
  process.exit(1);
});

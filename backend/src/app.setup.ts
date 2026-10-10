import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  const origins = (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const instance = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: unknown) => void;
    disable: (key: string) => void;
  };
  // Necesario para que el rate limiting use la IP real detras de un proxy.
  instance.set('trust proxy', 1);
  instance.disable('x-powered-by');

  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: origins, credentials: true });

  // Mitigacion CSRF: en peticiones que cambian estado, si viene cabecera Origin
  // debe pertenecer al allowlist de CORS. Sin Origin (p. ej. clientes no
  // navegador) se permite, ya que no hay riesgo de CSRF entre sitios.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!UNSAFE_METHODS.has(req.method.toUpperCase())) {
      next();
      return;
    }
    const origin = req.headers.origin;
    if (!origin || origins.includes(origin)) {
      next();
      return;
    }
    res.status(403).json({ statusCode: 403, message: 'Origen no permitido' });
  });
}

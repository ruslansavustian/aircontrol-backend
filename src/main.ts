import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { config } from './config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.useBodyParser('json', { limit: '4kb' });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: false,
    validationError: { target: false, value: false },
  }));
  app.enableShutdownHooks();
  await app.listen(config.port, '0.0.0.0');
  Logger.log(`Listening on port ${config.port}; POST /api/v1/measurements`, 'Bootstrap');
}

void bootstrap().catch(() => {
  Logger.error('Backend startup failed', 'Bootstrap');
  process.exitCode = 1;
});

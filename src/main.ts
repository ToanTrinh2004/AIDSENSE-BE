import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const allowedOrigins = "*"

  app.enableCors({
    origin: allowedOrigins,
  });

 // size limits to prevent abuse (e.g., large file uploads)
  app.use(require('express').json({ limit: '5mb' }));
  app.use(require('express').urlencoded({ limit: '5mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
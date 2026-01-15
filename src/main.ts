// Load environment variables from .env (if present) before anything else.
// This keeps existing deployments working while enabling local .env-based configs
// for BREVO_* and other settings.
import 'dotenv/config';

import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (!process.env.JWT_SECRET) {
    console.warn(
      '⚠️  JWT_SECRET is not set. Using the default dev secret. Set JWT_SECRET in your .env for security.',
    );
  }

  // 🔹 Enable DTO validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 🔹 Enable class-transformer (@Exclude)
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // 🔹 Enable CORS (frontend integration ready)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 🔹 Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Training & Competency Matrix API')
    .setDescription('Backend APIs for Training & Competency Management System')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Server running on port ${port}`);
  console.log(`📘 Swagger available at http://localhost:${port}/api`);
}
bootstrap();

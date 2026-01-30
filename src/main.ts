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

  const isProd = process.env.NODE_ENV === 'production';

  if (!process.env.JWT_SECRET) {
    if (isProd) {
      // Fail fast in production so we don't run with an insecure fallback secret.
      throw new Error('JWT_SECRET is required in production');
    }
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
  // Use CORS_ORIGIN as a comma-separated allowlist; fall back to permissive in dev.
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
    : true;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // 🔹 Swagger Configuration (dev-only by default)
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
  const swaggerEnabled = !isProd || process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    SwaggerModule.setup('api', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Server running on port ${port}`);
  if (swaggerEnabled) {
    console.log(`📘 Swagger available at http://localhost:${port}/api`);
  }
}
bootstrap();

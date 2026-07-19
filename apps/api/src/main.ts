import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as Sentry from '@sentry/node';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

// Initialize Sentry early
Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://placeholder@sentry.io/12345",
  tracesSampleRate: 1.0,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryExceptionFilter(httpAdapter));
  
  // Ponytail: Minimalist Swagger config for File 05 Guardrails
  const config = new DocumentBuilder()
    .setTitle('RankForge API')
    .setDescription('The core backend service for RankForge')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
  app.enableCors();
}
bootstrap();

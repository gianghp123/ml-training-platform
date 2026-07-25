import { ConsoleLogger, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import expressBasicAuth from 'express-basic-auth';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ?? 3000;
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: process.env.NODE_ENV === 'production' }),
  });
  const configService = app.get(ConfigService);
  app.use(helmet());
  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ extended: true, limit: '100mb' }));
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });

  if (process.env.NODE_ENV !== 'production') {
    const swaggerUser = configService.get<string>('SWAGGER_USER');
    const swaggerPassword = configService.get<string>('SWAGGER_PASSWORD');
    app.use(['/api'], expressBasicAuth({ users: { [swaggerUser]: swaggerPassword }, challenge: true }));
    const config = new DocumentBuilder().setTitle('Training ML Pipeline API').setDescription('Description').setVersion('1.0').build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, cleanupOpenApiDoc(document), {});
    logger.log('Swagger UI enabled (non-production)');
    logger.log(`Swagger UI available at: http://localhost:${port}/api`)
  } else {
    logger.log('Swagger UI disabled (production)');
  }
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('BFFBootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Préfixe d'API unifié
  app.setGlobalPrefix('api/v1');

  // 2. Activation des CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // 3. Validation stricte des DTOs (Régulation ANJ, montants, cotes)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 4. Documentation OpenAPI / Swagger
  const config = new DocumentBuilder()
    .setTitle('FDJ Parions Sport - BFF API')
    .setDescription(
      'Backend For Frontend (BFF) de la BU Sport FDJ : Agrégation de catalogue, diffusion WebSockets temps réel, bannières CMS et QR Code Point de Vente.',
    )
    .setVersion('1.0.0')
    .addTag(
      'Sports Catalog',
      'Catalogue des matchs et cotes agrégées en direct',
    )
    .addTag(
      'Tickets & Point de Vente',
      'Préparation et validation de tickets avec QR Code signés (ANJ)',
    )
    .addTag('CMS Marketing', 'Contenus promotionnels et bannières (MongoDB)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(
    `🚀 [FDJ BFF] Démarré avec succès sur http://localhost:${port}/api/v1`,
  );
  logger.log(
    `📖 [SWAGGER] Documentation Swagger disponible sur http://localhost:${port}/api/docs`,
  );
}
bootstrap();

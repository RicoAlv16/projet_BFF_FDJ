import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: ['localhost:9092'],
          clientId: 'fdj-odds-worker',
        },
        consumer: {
          groupId: 'fdj-odds-worker-group',
        },
      },
    },
  );

  // Validation stricte des DTOs
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen();
  logger.log('🚀 [FDJ WORKER] Microservice Kafka démarré et à l\'écoute des streams !');
}
bootstrap();

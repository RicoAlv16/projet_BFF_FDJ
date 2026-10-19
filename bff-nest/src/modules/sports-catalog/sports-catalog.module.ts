import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SportsCatalogController } from './sports-catalog.controller';
import { SportsCatalogService } from './sports-catalog.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
  ],
  controllers: [SportsCatalogController],
  providers: [SportsCatalogService],
  exports: [SportsCatalogService],
})
export class SportsCatalogModule {}

import { Module } from '@nestjs/common';
import { RedisModule } from './redis/redis.module';
import { SportsCatalogModule } from './modules/sports-catalog/sports-catalog.module';
import { LiveGatewayModule } from './modules/live-gateway/live-gateway.module';
import { CmsModule } from './modules/cms/cms.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    RedisModule,
    SportsCatalogModule,
    LiveGatewayModule, // Connexion à la base MongoDB CMS FDJ
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://localhost:27017/fdj_cms',
    ),
    CmsModule,
  ],
})
export class AppModule {}

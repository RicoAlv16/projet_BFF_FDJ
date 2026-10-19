import { Module } from '@nestjs/common';
import { RedisModule } from './redis/redis.module';
import { OddsConsumer } from './consumers/odds.consumer';

@Module({
  imports: [RedisModule],
  controllers: [OddsConsumer],
})
export class AppModule {}

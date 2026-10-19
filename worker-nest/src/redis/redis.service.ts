import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;
  private pubClient: Redis;

  onModuleInit() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    };

    this.redisClient = new Redis(redisConfig);
    this.pubClient = new Redis(redisConfig);

    console.log('⚡ [REDIS] Connecté avec succès au cache Redis sur le port 6379');
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
    this.pubClient.disconnect();
  }

  /**
   * Sauvegarde la cote en mémoire vive dans un Hash Redis : odds:<matchId> -> oddId = JSON
   */
  async setLiveOdd(matchId: string, oddId: string, data: any): Promise<void> {
    const hashKey = `odds:${matchId}`;
    await this.redisClient.hset(hashKey, oddId, JSON.stringify(data));
    // Expire le cache après 2 heures si le match est terminé
    await this.redisClient.expire(hashKey, 7200);
  }

  /**
   * Émet un événement sur le bus Redis Pub/Sub pour le BFF
   */
  async publishOddUpdate(channel: string, data: any): Promise<void> {
    await this.pubClient.publish(channel, JSON.stringify(data));
  }

  /**
   * Émet un événement de match (But, VAR) sur le bus Redis Pub/Sub
   */
  async publishMatchEvent(channel: string, data: any): Promise<void> {
    await this.pubClient.publish(channel, JSON.stringify(data));
  }
}

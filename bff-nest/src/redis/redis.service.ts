import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;
  private subClient: Redis;
  private channelHandlers = new Map<string, Array<(message: string) => void>>();

  constructor() {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    };

    // Initialisation immédiate dans le constructeur pour éviter que subClient soit undefined
    this.redisClient = new Redis(config);
    this.subClient = new Redis(config);

    // Écouteur centralisé pour distribuer les messages reçus aux bons callbacks
    this.subClient.on('message', (channel: string, message: string) => {
      const handlers = this.channelHandlers.get(channel);
      if (handlers) {
        handlers.forEach((callback) => callback(message));
      }
    });

    this.logger.log(
      `⚡ [REDIS BFF] Connecté au cache Redis sur le port ${config.port}`,
    );
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
    this.subClient.disconnect();
  }

  getClient(): Redis {
    return this.redisClient;
  }

  /**
   * Récupère toutes les cotes d'un match depuis le Hash Redis
   * Clé: odds:<matchId> -> { [oddId]: JSON }
   */
  async getMatchOdds(matchId: string): Promise<Record<string, any>> {
    const rawOdds = await this.redisClient.hgetall(`odds:${matchId}`);
    const parsedOdds: Record<string, any> = {};

    for (const [oddId, jsonString] of Object.entries(rawOdds)) {
      try {
        parsedOdds[oddId] = JSON.parse(jsonString);
      } catch (err) {
        this.logger.warn(
          `Impossible de parser la cote ${oddId} pour le match ${matchId}`,
        );
      }
    }

    return parsedOdds;
  }

  /**
   * S'abonne à un canal Redis Pub/Sub et enregistre le callback
   */
  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    if (!this.channelHandlers.has(channel)) {
      this.channelHandlers.set(channel, []);
      await this.subClient.subscribe(channel);
      this.logger.log(`📡 [REDIS PUBSUB] BFF abonné au canal: ${channel}`);
    }
    this.channelHandlers.get(channel)!.push(callback);
  }
}

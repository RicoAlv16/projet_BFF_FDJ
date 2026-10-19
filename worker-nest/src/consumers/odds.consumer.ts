import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RedisService } from '../redis/redis.service';
import { OddsUpdatedDto } from './dto/odds-updated.dto';
import { MatchEventDto } from './dto/match-event.dto';

@Controller()
export class OddsConsumer {
  private readonly logger = new Logger(OddsConsumer.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Consommation des cotes en direct depuis Kafka (Mode Event-Driven)
   */
  @EventPattern('sports.odds.updated')
  async handleOddsUpdated(@Payload() data: OddsUpdatedDto) {
    this.logger.log(
      `📥 [KAFKA -> WORKER] Cote reçue: match=${data.matchId} | ${data.selectionName}=${data.currentValue}`,
    );

    // 1. Stockage dans le cache chaud Redis (clé: odds:match-psg-om)
    await this.redisService.setLiveOdd(data.matchId, data.oddId, data);

    // 2. Publication en temps réel sur le canal Redis Pub/Sub pour le BFF
    await this.redisService.publishOddUpdate('odds:channel', data);
  }

  /**
   * Consommation des événements de match (Buts, VAR) depuis Kafka
   */
  @EventPattern('sports.match.events')
  async handleMatchEvents(@Payload() event: MatchEventDto) {
    this.logger.warn(
      `⚡ [KAFKA -> WORKER] Événement match: ${event.matchId} -> ${event.eventType} (${event.description})`,
    );

    // Publication immédiate pour alerter le BFF et les WebSockets
    await this.redisService.publishMatchEvent('match-events:channel', event);
  }
}

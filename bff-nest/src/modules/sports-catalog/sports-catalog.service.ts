import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class SportsCatalogService {
  private readonly logger = new Logger(SportsCatalogService.name);
  private readonly javaEngineUrl =
    process.env.JAVA_ENGINE_URL || 'http://localhost:8081';

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Récupère tous les matchs en direct, enrichis avec les cotes chaudes en temps réel de Redis
   */
  async getLiveMatches(): Promise<any[]> {
    try {
      // 1. Récupération du catalogue structurel depuis le Core Java
      const response = await firstValueFrom(
        this.httpService.get(`${this.javaEngineUrl}/api/v1/matches/live`),
      );
      const matches = response.data;

      // 2. Injection des cotes fraîches Redis pour chaque match
      for (const match of matches) {
        await this.enrichMatchWithLiveOdds(match);
      }

      return matches;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Erreur récupération matchs Core Java: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Récupère un match spécifique par son identifiant
   */
  async getMatchById(matchId: string): Promise<any> {
    const liveMatches = await this.getLiveMatches();
    return liveMatches.find((m) => m.id === matchId) || null;
  }

  /**
   * Injecte les cotes du cache Redis dans les marchés du match
   */
  private async enrichMatchWithLiveOdds(match: any): Promise<void> {
    const redisOdds = await this.redisService.getMatchOdds(match.id);
    if (!redisOdds || Object.keys(redisOdds).length === 0) {
      return;
    }

    if (match.markets && Array.isArray(match.markets)) {
      for (const market of match.markets) {
        if (market.odds && Array.isArray(market.odds)) {
          for (const odd of market.odds) {
            const hotOdd = redisOdds[odd.id];
            if (hotOdd) {
              odd.previousValue = Number(hotOdd.previousValue);
              odd.currentValue = Number(hotOdd.currentValue);
              odd.status = hotOdd.status;
              odd.isLiveHot = true; // Marqueur visuel pour le front
              odd.lastUpdateTimestamp = hotOdd.timestamp;
            }
          }
        }
      }
    }
  }
}

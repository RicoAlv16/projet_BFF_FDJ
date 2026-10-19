export type MatchStatus = 'LIVE' | 'PRE_MATCH' | 'SUSPENDED' | 'FINISHED';
export type MarketStatus = 'OPEN' | 'SUSPENDED' | 'CLOSED';
export type OddStatus = 'ACTIVE' | 'SUSPENDED';

export interface Odd {
  id: string;
  marketId: string;
  selectionName: string;
  currentValue: number;
  previousValue: number;
  status: OddStatus;
  probability?: number;
  isLiveHot?: boolean;
  lastUpdateTimestamp?: number;
  flashState?: 'up' | 'down' | null;
}

export interface Market {
  id: string;
  matchId: string;
  marketType: '1N2' | 'BOTH_TEAMS_SCORE' | 'OVER_UNDER_2_5' | string;
  name: string;
  status: MarketStatus;
  displayOrder?: number;
  odds: Odd[];
}

export interface SportMatch {
  id: string;
  competitionId: string;
  competitionName?: string;
  country?: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: MatchStatus;
  scoreHome: number;
  scoreAway: number;
  minuteElapsed: number;
  isLive: boolean;
  markets: Market[];
}

export interface OddUpdatedPayload {
  matchId: string;
  oddId: string;
  marketId?: string;
  selectionName: string;
  currentValue: number;
  previousValue?: number;
  status?: OddStatus;
  timestamp: number;
}

export interface MatchEventPayload {
  matchId: string;
  eventType: 'GOAL' | 'VAR' | 'YELLOW_CARD' | 'RED_CARD' | 'PERIOD_START' | 'PERIOD_END' | string;
  description: string;
  scoreHome: number;
  scoreAway: number;
  minute: number;
  timestamp: number;
}

export interface TelemetryLog {
  id: string;
  type: 'ODD_UPDATE' | 'MATCH_EVENT' | 'KAFKA_STREAM' | 'REDIS_PUBSUB' | 'SYSTEM' | 'USER_ACTION';
  source: 'JAVA_CORE' | 'KAFKA' | 'WORKER_NEST' | 'REDIS' | 'BFF_NEST' | 'ANGULAR';
  summary: string;
  detail: any;
  timestamp: Date;
  matchId?: string;
}

export interface BetSelection {
  matchId: string;
  matchTitle: string;
  marketId: string;
  marketName: string;
  oddId: string;
  selectionName: string;
  oddValue: number;
  initialValue: number;
  hasChanged?: boolean;
}

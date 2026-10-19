import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class MatchEventDto {
  @IsString()
  @IsNotEmpty()
  matchId: string;

  @IsString()
  @IsNotEmpty()
  eventType: string; // 'GOAL', 'VAR_REVIEW'

  @IsOptional()
  @IsNumber()
  scoreHome?: number;

  @IsOptional()
  @IsNumber()
  scoreAway?: number;

  @IsOptional()
  @IsNumber()
  minuteElapsed?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  timestamp?: string;
}

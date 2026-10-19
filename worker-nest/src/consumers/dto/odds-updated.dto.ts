import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class OddsUpdatedDto {
  @IsString()
  @IsNotEmpty()
  matchId: string;

  @IsString()
  @IsNotEmpty()
  marketId: string;

  @IsString()
  @IsNotEmpty()
  oddId: string;

  @IsString()
  @IsNotEmpty()
  selectionName: string;

  @IsNumber()
  previousValue: number;

  @IsNumber()
  currentValue: number;

  @IsString()
  status: string; // 'ACTIVE', 'SUSPENDED'

  @IsOptional()
  timestamp?: string;
}

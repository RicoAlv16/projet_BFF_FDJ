import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SportsCatalogService } from './sports-catalog.service';

@ApiTags('Sports Catalog')
@Controller('sports')
export class SportsCatalogController {
  constructor(private readonly sportsCatalogService: SportsCatalogService) {}

  @Get('matches/live')
  @ApiOperation({
    summary: 'Liste des matchs en direct avec cotes agrégées',
    description:
      'Appelle le Core Java et fusionne instantanément les cotes fraîches en mémoire vive depuis Redis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Matchs en direct récupérés avec succès',
  })
  async getLiveMatches() {
    return this.sportsCatalogService.getLiveMatches();
  }

  @Get('matches/:id')
  @ApiOperation({
    summary: "Détail d'un match en direct",
    description:
      'Retourne un match spécifique avec tous ses marchés et cotes temps réel.',
  })
  @ApiParam({
    name: 'id',
    example: 'match-psg-om',
    description: 'Identifiant unique du match',
  })
  @ApiResponse({ status: 200, description: 'Match trouvé' })
  @ApiResponse({ status: 404, description: 'Match introuvable' })
  async getMatchById(@Param('id') id: string) {
    const match = await this.sportsCatalogService.getMatchById(id);
    if (!match) {
      throw new NotFoundException(`Match introuvable avec l'ID: ${id}`);
    }
    return match;
  }
}

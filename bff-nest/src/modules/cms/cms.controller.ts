import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CmsService } from './cms.service';

@ApiTags('CMS Marketing')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('banners')
  @ApiOperation({
    summary: 'Bannières marketing et promotionnelles FDJ',
    description:
      'Retourne les bannières promotionnelles et mentions légales ANJ filtrables par canal (PSEL / PSPDV).',
  })
  @ApiQuery({
    name: 'channel',
    required: false,
    enum: ['ALL', 'PSEL', 'PSPDV'],
    description: 'Canal applicatif cible',
  })
  @ApiResponse({ status: 200, description: 'Bannières récupérées avec succès' })
  async getBanners(@Query('channel') channel?: string) {
    return this.cmsService.getBanners(channel);
  }

  @Get('competitions/featured')
  @ApiOperation({
    summary: 'Compétitions sportives à la une',
    description:
      'Retourne la liste des compétitions phares configurées par le marketing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Compétitions récupérées avec succès',
  })
  async getFeaturedCompetitions() {
    return this.cmsService.getFeaturedCompetitions();
  }
}

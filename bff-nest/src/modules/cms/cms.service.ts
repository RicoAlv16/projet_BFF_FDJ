import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument } from './schemas/banner.schema';
import {
  FeaturedCompetition,
  FeaturedCompetitionDocument,
} from './schemas/featured-competition.schema';

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(
    @InjectModel(Banner.name)
    private readonly bannerModel: Model<BannerDocument>,
    @InjectModel(FeaturedCompetition.name)
    private readonly competitionModel: Model<FeaturedCompetitionDocument>,
  ) {}

  /**
   * Récupère les bannières actives selon le canal (PSEL, PSPDV ou ALL)
   */
  async getBanners(channel?: string): Promise<Banner[]> {
    const filter: any = { active: true };

    if (channel && channel !== 'ALL') {
      filter.$or = [{ targetChannel: 'ALL' }, { targetChannel: channel }];
    }

    return this.bannerModel.find(filter).sort({ displayOrder: 1 }).exec();
  }

  /**
   * Récupère les compétitions mises en avant sur l'accueil
   */
  async getFeaturedCompetitions(): Promise<FeaturedCompetition[]> {
    return this.competitionModel.find().sort({ displayOrder: 1 }).exec();
  }
}

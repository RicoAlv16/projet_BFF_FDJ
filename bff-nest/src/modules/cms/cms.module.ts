import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Banner, BannerSchema } from './schemas/banner.schema';
import {
  FeaturedCompetition,
  FeaturedCompetitionSchema,
} from './schemas/featured-competition.schema';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Banner.name, schema: BannerSchema },
      { name: FeaturedCompetition.name, schema: FeaturedCompetitionSchema },
    ]),
  ],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}

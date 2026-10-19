import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FeaturedCompetitionDocument = FeaturedCompetition & Document;

@Schema({ collection: 'featured_competitions' })
export class FeaturedCompetition {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  sport: string;

  @Prop()
  badge: string;

  @Prop({ default: 0 })
  displayOrder: number;
}

export const FeaturedCompetitionSchema =
  SchemaFactory.createForClass(FeaturedCompetition);

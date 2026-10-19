import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BannerDocument = Banner & Document;

@Schema({ collection: 'banners', timestamps: true })
export class Banner {
  @Prop({ required: true })
  title: string;

  @Prop()
  subtitle: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop()
  ctaText: string;

  @Prop()
  ctaLink: string;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: 0 })
  displayOrder: number;

  @Prop({ default: 'ALL', enum: ['ALL', 'PSEL', 'PSPDV'] })
  targetChannel: string;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);

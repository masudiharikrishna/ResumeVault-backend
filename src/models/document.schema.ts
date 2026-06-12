import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export type DocumentDocument = Document & MongooseDocument;

@Schema({ timestamps: true })
export class Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  size: string;

  @Prop({ required: true, enum: ['resume', 'cover-letter'] })
  type: string;

  @Prop({ required: true })
  s3Key: string;

  @Prop({ required: true })
  iv: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);

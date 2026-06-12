import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document, DocumentSchema } from '../../models/document.schema';
import { EncryptionService } from './encryption.service';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Document.name, schema: DocumentSchema }]),
    S3Module,
  ],
  providers: [DocumentsService, EncryptionService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}

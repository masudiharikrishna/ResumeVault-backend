import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Document, DocumentDocument } from '../../models/document.schema';
import { EncryptionService } from './encryption.service';
import { S3Service } from '../s3/s3.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document.name) private readonly documentModel: Model<DocumentDocument>,
    private readonly encryptionService: EncryptionService,
    private readonly s3Service: S3Service,
  ) {}

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ s3Key: string; iv: string; size: string; fileName: string; mimeType: string; url: string }> {
    try {
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      // Generate unique S3 key
      const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const s3Key = `documents/${userId}/${uniqueId}-${safeFileName}`;

      // Encrypt file buffer
      const { encryptedData, iv } = this.encryptionService.encrypt(file.buffer);

      // Upload encrypted data to S3
      const url = await this.s3Service.uploadFile(encryptedData, s3Key, file.mimetype);

      // Format file size
      const size = this.formatBytes(file.size);

      return {
        s3Key,
        iv,
        size,
        fileName: file.originalname,
        mimeType: file.mimetype,
        url,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('File upload failed: ' + error.message);
    }
  }

  async createDocument(userId: string, createDocumentDto: CreateDocumentDto): Promise<DocumentDocument> {
    try {
      const document = new this.documentModel({
        ...createDocumentDto,
        userId,
      });
      return await document.save();
    } catch (error: any) {
      throw new InternalServerErrorException('Document metadata creation failed: ' + error.message);
    }
  }

  async listDocuments(
    userId: string,
    query?: string,
    type?: string,
    page: number = 1,
    limit: number = 6,
  ): Promise<any> {
    try {
      const filter: any = { userId, isDeleted: { $ne: true } };
      
      if (type) {
        filter.type = type;
      }
      
      if (query) {
        filter.$or = [
          { title: { $regex: query, $options: 'i' } },
          { fileName: { $regex: query, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [docs, total, typeCounts] = await Promise.all([
        this.documentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
        this.documentModel.countDocuments(filter).exec(),
        this.documentModel.aggregate([
          { $match: { userId: new Types.ObjectId(userId), isDeleted: { $ne: true } } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]).exec(),
      ]);

      const counts: Record<string, number> = {
        resume: 0,
        'cover-letter': 0
      };

      typeCounts.forEach((tc) => {
        if (tc._id) {
          counts[tc._id] = tc.count;
        }
      });

      return {
        docs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        counts,
      };
    } catch (error: any) {
      throw new InternalServerErrorException('Error listing documents: ' + error.message);
    }
  }

  async previewDocument(
    userId: string,
    documentId: string,
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    try {
      const document = await this.documentModel.findById(documentId);
      if (!document || document.userId.toString() !== userId || document.isDeleted) {
        throw new NotFoundException('Document not found');
      }

      // Download encrypted buffer from S3
      const encryptedBuffer = await this.s3Service.downloadFile(document.s3Key);

      // Decrypt buffer
      const decryptedBuffer = this.encryptionService.decrypt(encryptedBuffer, document.iv);

      return {
        buffer: decryptedBuffer,
        fileName: document.fileName,
        mimeType: document.mimeType,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Document preview retrieval failed: ' + error.message);
    }
  }

  async deleteDocument(userId: string, documentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const document = await this.documentModel.findOneAndUpdate(
        { _id: documentId, userId, isDeleted: { $ne: true } },
        { isDeleted: true },
        { new: true }
      ).exec();

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      return { success: true, message: 'Document deleted successfully' };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Document deletion failed: ' + error.message);
    }
  }

  private formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

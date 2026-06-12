import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Req, 
  Res, 
  UseInterceptors, 
  UploadedFile, 
  UsePipes, 
  ValidationPipe 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDocumentDto } from './dto/create-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const userId = req.user.sub;
    return this.documentsService.uploadFile(userId, file);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createDocument(@Req() req: any, @Body() createDocumentDto: CreateDocumentDto) {
    const userId = req.user.sub;
    return this.documentsService.createDocument(userId, createDocumentDto);
  }

  @Get()
  async listDocuments(
    @Req() req: any,
    @Query('query') query?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.sub;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 6;
    return this.documentsService.listDocuments(userId, query, type, pageNum, limitNum);
  }

  @Get(':id/preview')
  async previewDocument(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const userId = req.user.sub;
    const { buffer, fileName, mimeType } = await this.documentsService.previewDocument(userId, id);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.end(buffer);
  }

  @Get(':id/download')
  async downloadDocument(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const userId = req.user.sub;
    const { buffer, fileName, mimeType } = await this.documentsService.previewDocument(userId, id);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.end(buffer);
  }

  @Delete(':id')
  async deleteDocument(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.documentsService.deleteDocument(userId, id);
  }
}

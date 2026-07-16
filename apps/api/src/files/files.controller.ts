import { Body, Controller, Get, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { presignUploadSchema, type PresignUploadInput } from '@otc/shared';
import { FilesService } from './files.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  /** เซลล์ขอ URL อัปโหลดสลิป → อัปโหลดตรงเข้า MinIO ด้วย PUT */
  @Roles('SALE', 'ADMIN', 'SYSTEM_ADMIN')
  @Post('presign')
  presignUpload(@Body(new ZodBody(presignUploadSchema)) body: PresignUploadInput) {
    return this.files.presignUpload(body.fileName, body.contentType);
  }

  /** ขอ URL ดูรูปหลักฐาน */
  @Roles('SALE', 'ADMIN', 'SYSTEM_ADMIN')
  @Get('view')
  view(@Query('key') key: string) {
    if (!key) throw new BadRequestException('ต้องระบุ key');
    return this.files.presignView(key);
  }
}

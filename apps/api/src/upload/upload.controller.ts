import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards.js';

const storage = diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `evidence-${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('upload')
export class UploadController {
  // สลิปหลักฐานการชำระเงิน/การโอนสินค้า
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\//)) {
          return cb(new BadRequestException('รองรับเฉพาะไฟล์รูปภาพเท่านั้น'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('กรุณาเลือกไฟล์รูปภาพที่ต้องการอัปโหลด');
    }
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    return {
      fileName: file.filename,
      evidenceKey: file.filename, // ใช้ชื่อไฟล์เป็น key ใน DB
      url: `${BASE_URL}/api/upload/file/${file.filename}`,
    };
  }

  // เซิร์ฟไฟล์ภาพหลักฐาน
  @Get('file/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', filename);
    if (!existsSync(filePath)) {
      throw new BadRequestException('ไม่พบไฟล์รูปภาพที่ต้องการ');
    }
    return res.sendFile(filePath);
  }
}

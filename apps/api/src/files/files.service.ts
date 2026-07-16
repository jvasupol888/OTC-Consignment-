import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3: S3Client;
  private readonly bucket = process.env.S3_BUCKET ?? 'otc-evidence';
  private readonly ttl = Number(process.env.S3_PRESIGN_TTL ?? 300);

  constructor() {
    this.s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
      region: process.env.S3_REGION ?? 'us-east-1',
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
      },
    });
  }

  /** สร้าง presigned PUT URL ให้ client อัปโหลดรูปตรงเข้า S3/MinIO */
  async presignUpload(fileName: string, contentType: string) {
    const ext = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';
    const key = `evidence/${new Date().getFullYear()}/${randomUUID()}.${ext}`;

    const url = await getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: this.ttl },
    );
    return { key, uploadUrl: url, expiresIn: this.ttl };
  }

  /** สร้าง presigned GET URL ให้ดูรูปหลักฐาน */
  async presignView(key: string) {
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: this.ttl },
    );
    return { url, expiresIn: this.ttl };
  }

  /** ตรวจว่าไฟล์ถูกอัปโหลดจริงหรือยัง (ใช้ตอน submit เพื่อกัน key ปลอม) */
  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}

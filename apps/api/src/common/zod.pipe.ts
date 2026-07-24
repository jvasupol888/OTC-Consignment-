import { PipeTransform, BadRequestException } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/** Pipe แปลง/ตรวจ body ด้วย Zod schema จาก @otc/shared */
export class ZodBody<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      console.error('Zod Validation Failed:', result.error.flatten());
      throw new BadRequestException({
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: result.error.flatten(),
      });
    }
    return result.data;
  }
}

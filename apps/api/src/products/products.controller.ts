import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { upsertProductSchema, type UpsertProductInput, RECORD_STATUSES } from '@otc/shared';
import { z } from 'zod';
import { ProductsService } from './products.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';

const statusSchema = z.object({ status: z.enum(RECORD_STATUSES) });

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // อ่านได้ทั้ง admin และ sale (sale ใช้เลือกสินค้าตอนทำรายการ)
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SALE')
  @Get()
  list() {
    return this.products.list();
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post()
  upsert(@Body(new ZodBody(upsertProductSchema)) body: UpsertProductInput) {
    return this.products.upsert(body);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body(new ZodBody(statusSchema)) body: z.infer<typeof statusSchema>,
  ) {
    return this.products.setStatus(id, body.status);
  }
}

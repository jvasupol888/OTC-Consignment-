import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';
import { upsertProductSchema, type UpsertProductInput } from '@otc/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post()
  create(@Body(new ZodBody(upsertProductSchema)) body: UpsertProductInput) {
    return this.productsService.create(body);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodBody(upsertProductSchema)) body: UpsertProductInput,
  ) {
    return this.productsService.update(id, body);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

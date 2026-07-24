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
import { Roles, CurrentUser, type AuthUser } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';
import { upsertProductSchema, type UpsertProductInput } from '@otc/shared';
import { z } from 'zod';

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
  @Post('bulk')
  bulkImport(
    @Body(new ZodBody(z.array(upsertProductSchema))) items: UpsertProductInput[],
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.bulkImport(items, user.sub);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post()
  create(
    @Body(new ZodBody(upsertProductSchema)) body: UpsertProductInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.create(body, user.sub);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodBody(upsertProductSchema)) body: UpsertProductInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.update(id, body, user.sub);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.remove(id, user.sub);
  }
}

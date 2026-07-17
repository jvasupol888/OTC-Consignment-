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
import { StoresService } from './stores.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';
import { upsertStoreSchema, transferStoreSchema, type UpsertStoreInput, type TransferStoreInput } from '@otc/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  findAll() {
    return this.storesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storesService.findOne(id);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post()
  create(@Body(new ZodBody(upsertStoreSchema)) body: UpsertStoreInput) {
    return this.storesService.create(body);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodBody(upsertStoreSchema)) body: UpsertStoreInput,
  ) {
    return this.storesService.update(id, body);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post('transfer')
  transfer(@Body(new ZodBody(transferStoreSchema)) body: TransferStoreInput) {
    return this.storesService.transfer(body);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.storesService.remove(id);
  }
}

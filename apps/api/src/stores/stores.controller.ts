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
import { Roles, CurrentUser, type AuthUser } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';
import { upsertStoreSchema, transferStoreSchema, type UpsertStoreInput, type TransferStoreInput } from '@otc/shared';
import { z } from 'zod';

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
  @Post('bulk')
  bulkImport(
    @Body(new ZodBody(z.array(upsertStoreSchema))) items: UpsertStoreInput[],
    @CurrentUser() user: AuthUser,
  ) {
    return this.storesService.bulkImport(items, user.sub);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post()
  create(
    @Body(new ZodBody(upsertStoreSchema)) body: UpsertStoreInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.storesService.create(body, user.sub);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodBody(upsertStoreSchema)) body: UpsertStoreInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.storesService.update(id, body, user.sub);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post('transfer')
  transfer(
    @Body(new ZodBody(transferStoreSchema)) body: TransferStoreInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.storesService.transfer(body, user.sub);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.storesService.remove(id, user.sub);
  }
}

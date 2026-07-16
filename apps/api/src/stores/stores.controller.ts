import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  upsertStoreSchema,
  transferStoreSchema,
  type UpsertStoreInput,
  type TransferStoreInput,
} from '@otc/shared';
import { StoresService } from './stores.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles, CurrentUser, type AuthUser } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  // admin เห็นทุกร้าน; sale เห็นเฉพาะร้านที่ตนดูแล (row-level)
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SALE')
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.stores.list(user.role === 'SALE' ? user.sub : undefined);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post()
  upsert(@Body(new ZodBody(upsertStoreSchema)) body: UpsertStoreInput) {
    return this.stores.upsert(body);
  }

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post('transfer')
  transfer(@Body(new ZodBody(transferStoreSchema)) body: TransferStoreInput) {
    return this.stores.transfer(body.storeId, body.newUserId);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles, CurrentUser, type AuthUser } from '../auth/decorators.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /**
   * ดูสต็อก — admin เห็นทุกคน; sale เห็นเฉพาะสต็อกเซลล์ของตนเอง
   * query: ?type=SALE | PHARMACY
   */
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SALE')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query('type') type?: 'SALE' | 'PHARMACY') {
    const saleFilter = user.role === 'SALE' ? user.sub : undefined;
    return this.inventory.list({
      locationType: type,
      // sale ดูได้เฉพาะสต็อกตัวเอง (บังคับ SALE + filter uid)
      saleUserId: saleFilter,
    });
  }
}

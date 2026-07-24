import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { CurrentUser, type AuthUser } from '../auth/decorators.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('locationType') locationType?: 'SALE' | 'PHARMACY',
    @Query('saleUserId') saleUserId?: string,
  ) {
    // ถ้ารับสิทธิ์เป็น SALE จะดูได้แค่ของตัวเอง และร้านที่ตัวเองดูแล
    if (user.role === 'SALE') {
      return this.inventoryService.listForSaleAgent(user.sub);
    }

    // แอดมินดูได้หมด
    return this.inventoryService.list({
      locationType,
      saleUserId,
    });
  }
}

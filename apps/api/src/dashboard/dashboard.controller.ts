import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles, CurrentUser, type AuthUser } from '../auth/decorators.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Get('stats')
  getAdminStats() {
    return this.dashboardService.getAdminStats();
  }

  @Get('mobile')
  getMobileStats(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getMobileStats(user.sub);
  }
}

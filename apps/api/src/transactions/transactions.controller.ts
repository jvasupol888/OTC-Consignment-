import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  submitTransactionSchema,
  rejectTransactionSchema,
  type SubmitTransactionInput,
  type RejectTransactionInput,
} from '@otc/shared';
import { TransactionsService } from './transactions.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles, CurrentUser, type AuthUser } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly txns: TransactionsService) {}

  // เซลล์ส่งรายการ
  @Roles('SALE')
  @Post()
  submit(
    @CurrentUser() user: AuthUser,
    @Body(new ZodBody(submitTransactionSchema)) body: SubmitTransactionInput,
  ) {
    return this.txns.submit(user, body);
  }

  // แอดมินอนุมัติ
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post(':docNo/approve')
  approve(@Param('docNo') docNo: string, @CurrentUser() admin: AuthUser) {
    return this.txns.approve(docNo, admin);
  }

  // แอดมินปฏิเสธ
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post(':docNo/reject')
  reject(
    @Param('docNo') docNo: string,
    @CurrentUser() admin: AuthUser,
    @Body(new ZodBody(rejectTransactionSchema)) body: RejectTransactionInput,
  ) {
    return this.txns.reject(docNo, admin, body.remark);
  }

  // แอดมินยกเลิก (rollback ถ้าอนุมัติแล้ว)
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Post(':docNo/cancel')
  cancel(
    @Param('docNo') docNo: string,
    @CurrentUser() admin: AuthUser,
    @Body() body: { remark?: string },
  ) {
    return this.txns.cancel(docNo, admin, body?.remark);
  }
}

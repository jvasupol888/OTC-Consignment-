import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  submitTransactionSchema,
  rejectTransactionSchema,
  TXN_STATUSES,
  type SubmitTransactionInput,
  type RejectTransactionInput,
  type TxnStatus,
} from '@otc/shared';
import { TransactionsService } from './transactions.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles, CurrentUser, type AuthUser } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly txns: TransactionsService) {}

  // หน้าอนุมัติ (admin): list ทุกคน + กรอง ?status=PENDING
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Get()
  listForAdmin(@Query('status') status?: string) {
    const s = TXN_STATUSES.includes(status as TxnStatus) ? (status as TxnStatus) : undefined;
    return this.txns.list({ status: s });
  }

  // รายการของฉัน (sale): เห็นเฉพาะที่ตัวเองสร้าง
  @Roles('SALE')
  @Get('mine')
  listMine(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    const s = TXN_STATUSES.includes(status as TxnStatus) ? (status as TxnStatus) : undefined;
    return this.txns.list({ status: s, createdBy: user.sub });
  }

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

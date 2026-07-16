import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { upsertUserSchema, type UpsertUserInput, RECORD_STATUSES } from '@otc/shared';
import { z } from 'zod';
import { UsersService } from './users.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';

const statusSchema = z.object({ status: z.enum(RECORD_STATUSES) });

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SYSTEM_ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  upsert(@Body(new ZodBody(upsertUserSchema)) body: UpsertUserInput) {
    return this.users.upsert(body);
  }

  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body(new ZodBody(statusSchema)) body: z.infer<typeof statusSchema>,
  ) {
    return this.users.setStatus(id, body.status);
  }
}

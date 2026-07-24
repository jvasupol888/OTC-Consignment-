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
import { UsersService } from './users.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles, CurrentUser, type AuthUser } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';
import { upsertUserSchema, type UpsertUserInput } from '@otc/shared';
import { z } from 'zod';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SYSTEM_ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(
    @Body(new ZodBody(upsertUserSchema)) body: UpsertUserInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.create(body, user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodBody(upsertUserSchema)) body: UpsertUserInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.update(id, body, user.sub);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.remove(id, user.sub);
  }
}

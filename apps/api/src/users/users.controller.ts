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
import { Roles } from '../auth/decorators.js';
import { ZodBody } from '../common/zod.pipe.js';
import { upsertUserSchema, type UpsertUserInput } from '@otc/shared';

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
  create(@Body(new ZodBody(upsertUserSchema)) body: UpsertUserInput) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodBody(upsertUserSchema)) body: UpsertUserInput,
  ) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}

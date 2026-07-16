import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { loginSchema } from '@otc/shared';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards.js';
import { CurrentUser, type AuthUser } from './decorators.js';
import { ZodBody } from '../common/zod.pipe.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body(new ZodBody(loginSchema)) body: unknown) {
    return this.auth.login(body as any);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}

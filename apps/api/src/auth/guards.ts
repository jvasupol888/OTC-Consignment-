import {
  Injectable,
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@otc/shared';
import { ROLES_KEY, type AuthUser } from './decorators.js';

/** ตรวจ JWT (Bearer token) */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/** ตรวจ role ตาม @Roles(...) */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงรายการนี้');
    }
    return true;
  }
}

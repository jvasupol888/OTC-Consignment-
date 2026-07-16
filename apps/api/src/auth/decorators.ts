import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@otc/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthUser {
  sub: string; // user id
  username: string;
  role: UserRole;
  fullName: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthUser;
  },
);

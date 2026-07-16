import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { users, type Database } from '@otc/db';
import type { LoginInput } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';
import type { AuthUser } from './decorators.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  async login(input: LoginInput) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.username, input.username),
    });
    if (!user) throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    if (user.status === 'INACTIVE')
      throw new UnauthorizedException('บัญชีนี้ถูกปิดการใช้งานแล้ว');

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');

    const payload: AuthUser = {
      sub: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    };

    return {
      accessToken: await this.jwt.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
      }),
      refreshToken: await this.jwt.signAsync(
        { sub: user.id },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_TTL ?? '7d',
        },
      ),
      user: payload,
    };
  }
}

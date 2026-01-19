import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    // TEMP HARD CODE LOGIN (for training/demo)
    // Frontend placeholder credentials: admin@herosteels.com / admin123
    // Local quick credentials: admin@gmail.com / admin
    const isHardcodedAdmin =
      (email === 'admin@gmail.com' && password === 'admin') ||
      (email === 'admin@herosteels.com' && password === 'admin123');

    if (isHardcodedAdmin) {
      // For the admin to use any ".../me" endpoints, the JWT must contain a user id (sub).
      // We try to map the hardcoded admin email to a real DB user.
      const adminUser = await this.usersService.findByEmail(email);
      if (!adminUser) {
        throw new UnauthorizedException(
          `Hardcoded admin login succeeded, but no user exists in DB for ${email}. ` +
            `Create a user with this email (role ADMIN) or login with a real user account.`,
        );
      }

      return {
        access_token: this.jwtService.sign({
          sub: adminUser.id,
          email: adminUser.email,
          role: 'ADMIN',
          departmentId: adminUser.department?.id ?? null,
        }),
      };
    }

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // user.password is selected explicitly in UsersService.findByEmail
    if (!user.password) {
      throw new UnauthorizedException('Password not set for this user');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        departmentId: user.department?.id ?? null,
      }),
    };
  }
}

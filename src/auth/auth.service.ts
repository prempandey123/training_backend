import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {

    // 🔴 TEMPORARY HARDCODED ADMIN LOGIN
    if (email === 'admin@gmail.com' && password === 'admin') {
      const payload = {
        sub: 0,
        email: 'admin@gmail.com',
        role: 'ADMIN',
      };

      return {
        access_token: this.jwtService.sign(payload),
      };
    }

    // 🔽 NORMAL DB BASED LOGIN (will be used later)
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

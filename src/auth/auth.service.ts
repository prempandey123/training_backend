import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

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
      return {
        access_token: this.jwtService.sign({
          email,
          role: 'ADMIN',
        }),
      };
    }

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    };
  }
}

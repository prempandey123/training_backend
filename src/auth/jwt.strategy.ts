import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret && process.env.NODE_ENV === 'production') {
      // Fail fast in production if JWT secret is not configured.
      throw new Error('JWT_SECRET is required in production');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // In development, fall back to a default secret for convenience.
      // In production we fail fast above.
      secretOrKey: secret ?? 'DEV_ONLY_CHANGE_ME',
    });
  }

  async validate(payload: any) {
    return payload; // req.user
  }
}

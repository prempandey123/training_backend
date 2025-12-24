import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Keep expiresIn numeric (seconds) to satisfy typings
        const raw = config.get<string>('JWT_EXPIRES_IN');
        const expiresIn =
          raw && !Number.isNaN(Number(raw)) ? Number(raw) : 60 * 60 * 24; // default 1 day

        return {
          secret: config.get<string>('JWT_SECRET') ?? 'TEMP_JWT_SECRET_123',
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}

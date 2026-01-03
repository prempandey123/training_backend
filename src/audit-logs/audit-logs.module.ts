import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditLog } from './audit-log.entity';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { User } from '../users/users.entity';
import { Department } from '../departments/department.entity';
import { AuditLoggerMiddleware } from './audit-logger.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, User, Department]),
    // AuditLoggerMiddleware needs JwtService to read the current actor from Bearer token.
    // Import JwtModule here so JwtService is available in AuditLogsModule context.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const raw = config.get<string>('JWT_EXPIRES_IN');
        const expiresIn = raw && !Number.isNaN(Number(raw)) ? Number(raw) : 60 * 60 * 24;

        return {
          secret: config.get<string>('JWT_SECRET') ?? 'TEMP_JWT_SECRET_123',
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  providers: [AuditLogsService, AuditLoggerMiddleware],
  controllers: [AuditLogsController],
  exports: [AuditLogsService, AuditLoggerMiddleware],
})
export class AuditLogsModule {}

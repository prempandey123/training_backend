import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SkillModule } from './skills/skills.module';
import { DesignationModule } from './designations/designation.module';
import { DepartmentModule } from './departments/department.module';
import { DesignationSkillModule } from './designation-skills/designation-skill.module';
import { UserSkillLevelModule } from './user-skill-levels/user-skill-level.module';
import { SkillMatrixModule } from './skill-matrix/skill-matrix.module';
import { SkillGapModule } from './skill-gap/skill-gap.module';
import { TrainingModule } from './trainings/training.module';
import { TrainingRequirementsModule } from './training-requirements/training-requirements.module';
import { TrainingRecommendationModule } from './training-recommendation/training-recommendation.module';
import { ReportsModule } from './reports/reports.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuditLoggerMiddleware } from './audit-logs/audit-logger.middleware';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: (config.get<string>('DB_TYPE') as any) ?? 'postgres',
        host: config.get<string>('DB_HOST') ?? 'localhost',
        port: Number(config.get<string>('DB_PORT') ?? 5432),
        username: config.get<string>('DB_USERNAME') ?? 'postgres',
        password: config.get<string>('DB_PASSWORD') ?? 'postgres',
        database: config.get<string>('DB_NAME') ?? 'training',
        autoLoadEntities: true,
        // IMPORTANT: keep synchronize OFF by default to prevent accidental schema/data loss.
        // Enable explicitly via TYPEORM_SYNC=true for local/dev only.
        synchronize: (config.get<string>('TYPEORM_SYNC') ?? 'false') === 'true',
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: (config.get<string>('TYPEORM_MIGRATIONS_RUN') ?? 'false') === 'true',
      }),
    }),
    UsersModule,
    AuthModule,
    SkillModule,
    DesignationModule,
    DesignationSkillModule,
    DepartmentModule,
    UserSkillLevelModule,
    SkillMatrixModule,
    SkillGapModule,
    TrainingModule,
    TrainingRequirementsModule,
    TrainingRecommendationModule,
    ReportsModule,

    NotificationsModule,

    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditLoggerMiddleware).forRoutes('*');
  }
}

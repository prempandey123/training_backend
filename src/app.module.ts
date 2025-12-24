import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
        synchronize: (config.get<string>('TYPEORM_SYNC') ?? 'true') === 'true',
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
    SkillGapModule

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

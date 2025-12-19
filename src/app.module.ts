import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SkillModule } from './skills/skills.module';
import { DesignationModule } from './designations/designation.module';
import { DepartmentModule } from './departments/department.module';
import { DesignationSkillModule } from './designation-skills/designation-skill.module';
import { UserSkillLevelModule } from './user-skill-levels/user-skill-level.module';
import { SkillMatrixModule } from './skill-matrix/skill-matrix.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'Premp7@196',
  database: 'New',
  autoLoadEntities: true,
  synchronize: true, // dev only
}),
    UsersModule,
    AuthModule,
    SkillModule,
    DesignationModule,
    DesignationSkillModule,
    DepartmentModule,
    UserSkillLevelModule,
    SkillMatrixModule

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

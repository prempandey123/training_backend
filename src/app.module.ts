import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SkillsModule } from './skills/skills.module';
import { DesignationModule } from './designations/designation.module';
import { DepartmentModule } from './departments/department.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'Premp7@196',
  database: 'train',
  autoLoadEntities: true,
  synchronize: true, // dev only
}),
    UsersModule,
    AuthModule,
    SkillsModule,
    DesignationModule,
    DepartmentModule

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

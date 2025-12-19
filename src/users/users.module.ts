import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users.entity';
import { Department } from '../departments/department.entity';
import { Designation } from '../designations/designation.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Department,
      Designation,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 🔥 VERY IMPORTANT
})
export class UsersModule {}

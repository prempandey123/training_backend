import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './users.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // 🔥 THIS LINE FIXES ERROR
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 🔑 AuthModule ke liye required
})
export class UsersModule {}

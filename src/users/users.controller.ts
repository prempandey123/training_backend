import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 🔹 CREATE USER (EMPLOYEE)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // 🔹 LIST ALL USERS
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // 🔹 GET USER BY ID
    // ✅ Dashboard User Count
  @Get('stats/count')
  getUserStats() {
    return this.usersService.getUserStats();
  }

@Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // 🔹 UPDATE USER
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  // 🔹 DELETE USER (HARD DELETE for now)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}

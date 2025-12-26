import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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

  // ✅ Dashboard User Count
  @Get('stats/count')
  getUserStats() {
    return this.usersService.getUserStats();
  }

  // ✅ SMART SEARCH (for password page / dropdown etc.)
  // GET /users/search?q=prem
  @Get('search')
  search(@Query('q') q: string) {
    return this.usersService.searchUsers(q);
  }

  // 🔹 GET USER BY ID
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // 🔹 UPDATE USER
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  // ✅ UPDATE PASSWORD (Dedicated)
  // PATCH /users/1/password
  @Patch(':id/password')
  updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.updatePassword(id, dto);
  }

  // 🔹 DELETE USER (HARD DELETE for now)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}

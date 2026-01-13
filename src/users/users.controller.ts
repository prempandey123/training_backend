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
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 🔹 CREATE USER (EMPLOYEE)
  @Post()
  @Roles('ADMIN', 'HRD', 'HR')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // 🔹 LIST ALL USERS
  @Get()
  @Roles('ADMIN', 'HRD', 'HR', 'HOD')
  findAll(@Req() req: any) {
    return this.usersService.findAllScoped(req.user);
  }

  // ✅ Dashboard User Count
  @Get('stats/count')
  @Roles('ADMIN', 'HRD', 'HR')
  getUserStats() {
    return this.usersService.getUserStats();
  }

  // ✅ SMART SEARCH (for password page / dropdown etc.)
  // GET /users/search?q=prem
  @Get('search')
  @Roles('ADMIN', 'HRD', 'HR', 'HOD')
  search(@Req() req: any, @Query('q') q: string) {
    return this.usersService.searchUsersScoped(req.user, q);
  }

  // 🔹 GET USER BY ID
  @Get(':id')
  @Roles('ADMIN', 'HRD', 'HR', 'HOD')
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOneScoped(req.user, id);
  }

  // 🔹 UPDATE USER
  @Put(':id')
  @Roles('ADMIN', 'HRD', 'HR', 'HOD')
  async update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    // ✅ HOD can only edit users within their own department.
    // Also prevent HOD from changing department/role.
    const user = req.user;
    if (String(user?.role || '').toUpperCase() === 'HOD') {
      delete (dto as any).departmentId;
      delete (dto as any).role;
    }

    return this.usersService.updateScoped(user, id, dto);
  }

  // ✅ UPDATE PASSWORD (Dedicated)
  // PATCH /users/1/password
  @Patch(':id/password')
  @Roles('ADMIN', 'HRD', 'HR', 'HOD')
  updatePassword(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.updatePasswordScoped(req.user, id, dto);
  }

  // 🔹 DELETE USER (HARD DELETE for now)
  @Delete(':id')
  @Roles('ADMIN', 'HRD', 'HR')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}

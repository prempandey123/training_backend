import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Controller('departments')
export class DepartmentController {
  constructor(private readonly service: DepartmentService) {}

  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }

  // 🔥 CHANGE 1: optional search query (safe)
  // GET /departments
  // GET /departments?search=pr
  @Get()
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.service.softDelete(+id);
  }
}

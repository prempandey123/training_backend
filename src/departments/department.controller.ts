import {
  Controller,
  Post,
  Get,
  Body,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Controller('departments')
export class DepartmentController {
  constructor(private readonly service: DepartmentService) {}

  // CREATE
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }

  // LIST
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // DELETE (SOFT)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

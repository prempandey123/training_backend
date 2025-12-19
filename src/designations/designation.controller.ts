import { Body, Controller, Get, Post } from '@nestjs/common';
import { DesignationService } from './designation.service';
import { CreateDesignationDto } from './dto/create-designation.dto';

@Controller('designations')
export class DesignationController {
  constructor(private readonly service: DesignationService) {}

  @Post()
  create(@Body() dto: CreateDesignationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}

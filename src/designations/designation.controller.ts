import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Patch,
  Delete,
} from '@nestjs/common';
import { DesignationService } from './designation.service';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';

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

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.service.findOne(+id);
  }

  @Put(':id')
update(
  @Param('id') id: number,
  @Body() dto: UpdateDesignationDto,
) {
  return this.service.update(+id, dto);
}


  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: number) {
    return this.service.toggleStatus(+id);
  }

  @Delete(':id')
  softDelete(@Param('id') id: number) {
    return this.service.softDelete(+id);
  }
}

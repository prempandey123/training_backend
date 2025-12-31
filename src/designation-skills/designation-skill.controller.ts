import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { DesignationSkillService } from './designation-skill.service';
import { CreateDesignationSkillDto } from './dto/create-designation-skill.dto';

@Controller('designation-skills')
export class DesignationSkillController {
  constructor(private readonly service: DesignationSkillService) {}

  // MAP SKILL TO DESIGNATION
  @Post()
  create(@Body() dto: CreateDesignationSkillDto) {
    return this.service.create(dto);
  }

  // GET SKILLS FOR A DESIGNATION
  @Get('designation/:designationId')
  findByDesignation(
    @Param('designationId', ParseIntPipe) designationId: number,
  ) {
    return this.service.findByDesignation(designationId);
  }

  // REMOVE SKILL FROM DESIGNATION
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { SkillsService } from './skills.service';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  create(@Body() body) {
    return this.skillsService.create(body);
  }

  @Get()
  findAll() {
    return this.skillsService.findAll();
  }

  // ✅ THIS ENDPOINT WAS MISSING
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.skillsService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body) {
    return this.skillsService.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.skillsService.remove(+id);
  }
}

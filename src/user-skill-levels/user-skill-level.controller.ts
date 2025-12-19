import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UserSkillLevelService } from './user-skill-level.service';
import { CreateUserSkillLevelDto } from './dto/create-user-skill-level.dto';
import { UpdateUserSkillLevelDto } from './dto/update-user-skill-level.dto';

@Controller('user-skill-levels')
export class UserSkillLevelController {
  constructor(
    private readonly service: UserSkillLevelService,
  ) {}

  // CREATE / UPDATE LEVEL
  @Post()
  create(@Body() dto: CreateUserSkillLevelDto) {
    return this.service.create(dto);
  }

  // GET SKILLS FOR USER
  @Get('user/:userId')
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.findByUser(userId);
  }

  // UPDATE LEVEL BY ID
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserSkillLevelDto,
  ) {
    return this.service.update(id, dto);
  }
}

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UserSkillLevelService } from './user-skill-level.service';
import { CreateUserSkillLevelDto } from './dto/create-user-skill-level.dto';
import { UpdateUserSkillLevelDto } from './dto/update-user-skill-level.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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

  // ✅ EMPLOYEE: UPDATE OWN SKILL LEVEL (skillId comes in URL)
  @UseGuards(JwtAuthGuard)
  @Put('me/:skillId')
  upsertMine(
    @CurrentUser() user: any,
    @Param('skillId', ParseIntPipe) skillId: number,
    @Body() body: { currentLevel: number },
  ) {
    const userId = Number(user?.sub ?? user?.id);
    return this.service.upsertForUser(userId, skillId, body.currentLevel);
  }
}

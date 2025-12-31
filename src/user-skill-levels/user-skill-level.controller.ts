import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UnauthorizedException,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UserSkillLevelService } from './user-skill-level.service';
import { CreateUserSkillLevelDto } from './dto/create-user-skill-level.dto';
import { UpdateUserSkillLevelDto } from './dto/update-user-skill-level.dto';
import { BulkSetRequiredLevelsDto } from './dto/bulk-set-required-levels.dto';
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

  // ✅ ADMIN/HR: Bulk set required levels for a user
  // PUT /user-skill-levels/user/12/required-levels
  // Body: { levels: [{ skillId, requiredLevel }] }
  @Put('user/:userId/required-levels')
  bulkSetRequiredLevels(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: BulkSetRequiredLevelsDto,
  ) {
    return this.service.bulkSetRequiredLevels(userId, dto.levels);
  }

  // ✅ List users under a given level for a specific skill
  // GET /user-skill-levels/skill/12?maxLevel=3
  @Get('skill/:skillId')
  findUsersBySkillUnderLevel(
    @Param('skillId', ParseIntPipe) skillId: number,
    @Query('maxLevel') maxLevel?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const max = Number.isFinite(Number(maxLevel)) ? Number(maxLevel) : 3;
    const active = String(activeOnly ?? 'true').toLowerCase() !== 'false';
    return this.service.findUsersBySkillUnderLevel(skillId, max, active);
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
    if (!Number.isInteger(userId)) {
      throw new UnauthorizedException('Invalid token payload: missing user id');
    }
    return this.service.upsertForUser(userId, skillId, body.currentLevel);
  }
}

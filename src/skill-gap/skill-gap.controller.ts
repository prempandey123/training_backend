import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SkillGapService } from './skill-gap.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('skill-gap')
export class SkillGapController {
  constructor(private readonly service: SkillGapService) {}

  @Get('user/:userId')
  getUserSkillGap(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.getUserSkillGap(userId);
  }

  // ✅ EMPLOYEE: view own gap
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMySkillGap(@CurrentUser() user: any) {
    const userId = Number(user?.sub ?? user?.id);
    return this.service.getUserSkillGap(userId);
  }

  @Get('department/:departmentId')
  getDepartmentSkillGap(
    @Param('departmentId', ParseIntPipe) departmentId: number,
  ) {
    return this.service.getDepartmentSkillGap(departmentId);
  }
}

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SkillMatrixService } from './skill-matrix.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('skill-matrix')
export class SkillMatrixController {
  constructor(
    private readonly service: SkillMatrixService,
  ) {}

  @Get('user/:userId')
  getUserSkillMatrix(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.getUserSkillMatrix(userId);
  }

  // ✅ EMPLOYEE: view own matrix
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMySkillMatrix(@CurrentUser() user: any) {
    const userId = Number(user?.sub ?? user?.id);
    return this.service.getUserSkillMatrix(userId);
  }
}

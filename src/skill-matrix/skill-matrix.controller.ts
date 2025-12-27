import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UnauthorizedException,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SkillMatrixService } from './skill-matrix.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('skill-matrix')
export class SkillMatrixController {
  constructor(private readonly service: SkillMatrixService) {}

  // (Optional but recommended) protect this too
  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  getUserSkillMatrix(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.getUserSkillMatrix(userId);
  }

  // ✅ Org / All employees matrix
  @UseGuards(JwtAuthGuard)
  @Get('org')
  getOrgSkillMatrix(
    @Query('departmentId') departmentId?: string,
    @Query('designationId') designationId?: string,
    @Query('q') q?: string,
  ) {
    return this.service.getOrgSkillMatrix({
      departmentId: departmentId ? Number(departmentId) : undefined,
      designationId: designationId ? Number(designationId) : undefined,
      q: q?.trim() ? q.trim() : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMySkillMatrix(@CurrentUser() user: any) {
    const userId = Number(user?.sub ?? user?.id);
    if (!Number.isInteger(userId)) {
      throw new UnauthorizedException('Invalid token payload: missing user id');
    }
    return this.service.getUserSkillMatrix(userId);
  }
}

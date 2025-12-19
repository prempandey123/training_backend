import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { SkillGapService } from './skill-gap.service';

@Controller('skill-gap')
export class SkillGapController {
  constructor(
    private readonly service: SkillGapService,
  ) {}

  @Get('user/:userId')
  getUserSkillGap(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.getUserSkillGap(userId);
  }
  @Get('department/:departmentId')
getDepartmentSkillGap(
  @Param('departmentId', ParseIntPipe)
  departmentId: number,
) {
  return this.service.getDepartmentSkillGap(
    departmentId,
  );
}

}

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { SkillMatrixService } from './skill-matrix.service';

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
}

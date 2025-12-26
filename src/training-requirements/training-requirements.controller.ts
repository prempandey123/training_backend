import {
  Body,
  Controller,
  Get,
  UnauthorizedException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TrainingRequirementsService } from './training-requirements.service';
import { UpdateTrainingRequirementDto } from './dto/update-training-requirement.dto';

@Controller('training-requirements')
export class TrainingRequirementsController {
  constructor(private readonly service: TrainingRequirementsService) {}

  // Admin / HR can run for any user
  @Post('auto/user/:userId')
  autoCreateForUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.autoCreateForUser(userId);
  }

  // Employee can run for own
  @UseGuards(JwtAuthGuard)
  @Post('auto/me')
  autoCreateForMe(@CurrentUser() user: any) {
    const userId = Number(user?.sub ?? user?.id);
    if (!Number.isInteger(userId)) {
      throw new UnauthorizedException('Invalid token payload: missing user id');
    }
    return this.service.autoCreateForUser(userId);
  }

  @Get('user/:userId')
  listForUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('status') status?: 'OPEN' | 'IN_PROGRESS' | 'CLOSED',
  ) {
    return this.service.listForUser(userId, status as any);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  listForMe(@CurrentUser() user: any, @Query('status') status?: any) {
    const userId = Number(user?.sub ?? user?.id);
    if (!Number.isInteger(userId)) {
      throw new UnauthorizedException('Invalid token payload: missing user id');
    }
    return this.service.listForUser(userId, status);
  }

  @Patch(':id')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrainingRequirementDto,
  ) {
    return this.service.updateStatus(id, dto.status ?? 'OPEN');
  }
}

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { TrainingRecommendationService } from './training-recommendation.service';

@Controller('training-recommendations')
export class TrainingRecommendationController {
  constructor(
    private readonly service: TrainingRecommendationService,
  ) {}

  @Get('user/:userId')
  getUserRecommendations(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.getUserTrainingRecommendations(
      userId,
    );
  }
}

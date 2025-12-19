import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SkillMatrixModule } from '../skill-matrix/skill-matrix.module';
import { SkillGapModule } from '../skill-gap/skill-gap.module';
import { TrainingRecommendationModule } from '../training-recommendation/training-recommendation.module';

@Module({
  imports: [
    SkillMatrixModule,
    SkillGapModule,
    TrainingRecommendationModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

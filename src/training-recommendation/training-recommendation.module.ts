import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingRecommendationService } from './training-recommendation.service';
import { TrainingRecommendationController } from './training-recommendation.controller';
import { User } from '../users/users.entity';
import { SkillGapModule } from '../skill-gap/skill-gap.module';
import { TrainingSkill } from 'src/training_skills/training_skills.entity';

@Module({
  imports: [
    SkillGapModule,
    TypeOrmModule.forFeature([
      TrainingSkill,
      User,
    ]),
  ],
  controllers: [TrainingRecommendationController],
  providers: [TrainingRecommendationService],
})
export class TrainingRecommendationModule {}

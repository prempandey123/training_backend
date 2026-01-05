import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SkillMatrixModule } from '../skill-matrix/skill-matrix.module';
import { SkillGapModule } from '../skill-gap/skill-gap.module';
import { TrainingRecommendationModule } from '../training-recommendation/training-recommendation.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { Department } from '../departments/department.entity';
import { Skill } from '../skills/skill.entity';
import { Training } from '../trainings/training.entity';
import { TrainingRequirement } from '../training-requirements/training-requirement.entity';

@Module({
  imports: [
    SkillMatrixModule,
    SkillGapModule,
    TrainingRecommendationModule,
    TypeOrmModule.forFeature([User, Department, Skill, Training, TrainingRequirement]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingRequirement } from './training-requirement.entity';
import { TrainingRequirementsController } from './training-requirements.controller';
import { TrainingRequirementsService } from './training-requirements.service';
import { User } from '../users/users.entity';
import { DesignationSkill } from '../designation-skills/designation-skill.entity';
import { UserSkillLevel } from '../user-skill-levels/user-skill-level.entity';
import { TrainingSkill } from '../training_skills/training_skills.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrainingRequirement,
      User,
      DesignationSkill,
      UserSkillLevel,
      TrainingSkill,
    ]),
  ],
  controllers: [TrainingRequirementsController],
  providers: [TrainingRequirementsService],
  exports: [TrainingRequirementsService],
})
export class TrainingRequirementsModule {}

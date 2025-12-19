import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillMatrixService } from './skill-matrix.service';
import { SkillMatrixController } from './skill-matrix.controller';
import { User } from '../users/users.entity';
import { DesignationSkill } from '../designation-skills/designation-skill.entity';
import { UserSkillLevel } from '../user-skill-levels/user-skill-level.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      DesignationSkill,
      UserSkillLevel,
    ]),
  ],
  controllers: [SkillMatrixController],
  providers: [SkillMatrixService],
})
export class SkillMatrixModule {}

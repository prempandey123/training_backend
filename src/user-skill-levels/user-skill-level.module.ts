import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSkillLevel } from './user-skill-level.entity';
import { User } from '../users/users.entity';
import { Skill } from '../skills/skill.entity';
import { DesignationSkill } from '../designation-skills/designation-skill.entity';
import { UserSkillLevelService } from './user-skill-level.service';
import { UserSkillLevelController } from './user-skill-level.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserSkillLevel,
      User,
      Skill,
      DesignationSkill,
    ]),
  ],
  controllers: [UserSkillLevelController],
  providers: [UserSkillLevelService],
  exports: [UserSkillLevelService], // 🔥 used by Skill Matrix API
})
export class UserSkillLevelModule {}

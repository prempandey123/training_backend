import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillGapService } from './skill-gap.service';
import { SkillGapController } from './skill-gap.controller';
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
  controllers: [SkillGapController],
  providers: [SkillGapService],
  exports: [SkillGapService],
})
export class SkillGapModule {}

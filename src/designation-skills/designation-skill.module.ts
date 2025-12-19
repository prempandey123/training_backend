import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesignationSkill } from './designation-skill.entity';
import { Designation } from '../designations/designation.entity';
import { Skill } from '../skills/skill.entity';
import { DesignationSkillService } from './designation-skill.service';
import { DesignationSkillController } from './designation-skill.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DesignationSkill,
      Designation,
      Skill,
    ]),
  ],
  controllers: [DesignationSkillController],
  providers: [DesignationSkillService],
  exports: [DesignationSkillService], // 🔥 used by Skill Matrix
})
export class DesignationSkillModule {}

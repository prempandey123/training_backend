import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './skill.entity';
import { SkillService } from './skills.service';
import { SkillController } from './skills.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Skill])],
  controllers: [SkillController],
  providers: [SkillService],
  exports: [SkillService], // 🔥 used by DesignationSkill module
})
export class SkillModule {}

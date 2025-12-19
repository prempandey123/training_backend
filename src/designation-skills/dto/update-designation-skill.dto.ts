import { PartialType } from '@nestjs/mapped-types';
import { CreateDesignationSkillDto } from './create-designation-skill.dto';

export class UpdateDesignationSkillDto extends PartialType(
  CreateDesignationSkillDto,
) {}

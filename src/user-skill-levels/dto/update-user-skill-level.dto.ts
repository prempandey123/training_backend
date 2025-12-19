import { PartialType } from '@nestjs/mapped-types';
import { CreateUserSkillLevelDto } from './create-user-skill-level.dto';

export class UpdateUserSkillLevelDto extends PartialType(
  CreateUserSkillLevelDto,
) {}

import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateUserSkillLevelDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  currentLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  requiredLevel?: number;
}

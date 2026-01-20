import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateUserSkillLevelDto {
  @IsNotEmpty()
  @IsInt()
  userId: number;

  @IsNotEmpty()
  @IsInt()
  skillId: number;

  // current level can be omitted for HR flows that only set required skills.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  currentLevel?: number;

  // ✅ User-wise required/target level (optional)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  requiredLevel?: number;
}

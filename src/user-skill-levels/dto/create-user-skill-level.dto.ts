import {
  IsInt,
  IsNotEmpty,
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

  @IsInt()
  @Min(0)
  @Max(4)
  currentLevel: number;
}

import {
  IsInt,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';

export class CreateDesignationSkillDto {
  @IsNotEmpty()
  @IsInt()
  designationId: number;

  @IsNotEmpty()
  @IsInt()
  skillId: number;

  @IsInt()
  @Min(0)
  @Max(4)
  requiredLevel: number;
}

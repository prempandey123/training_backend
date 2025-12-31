import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateDesignationSkillDto {
  @IsNotEmpty()
  @IsInt()
  designationId: number;

  @IsNotEmpty()
  @IsInt()
  skillId: number;
}

import { IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateSkillDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  department?: string;

  @IsOptional()
  @IsBoolean()
  isCommon?: boolean;
}

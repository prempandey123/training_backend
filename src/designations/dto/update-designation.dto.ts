import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateDesignationDto {
  @IsString()
  @IsOptional()
  designationName?: string;

  @IsArray()
  @IsOptional()
  skills?: string[];
}

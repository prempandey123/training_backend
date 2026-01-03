import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateDesignationDto {
  @IsNotEmpty()
  @IsString()
  designationName: string;

  // 🔹 Departments where this designation is applicable
  // Optional: designation can be created without selecting any department.
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  departmentIds?: number[];
}

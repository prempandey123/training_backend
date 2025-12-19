import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsNumber,
} from 'class-validator';

export class CreateDesignationDto {
  @IsNotEmpty()
  @IsString()
  designationName: string;

  // 🔹 Departments where this designation is applicable
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  departmentIds: number[];
}

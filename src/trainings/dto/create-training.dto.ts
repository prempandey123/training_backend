import { IsArray, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TrainingType } from '../enums/training-type.enum';

class AssignedEmployeeDto {
  @IsString()
  @IsNotEmpty()
  empId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  dept?: string;
}

export class CreateTrainingDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  // UI sends YYYY-MM-DD
  @IsString()
  @IsNotEmpty()
  trainingDate: string;

  // UI sends "10:00 - 12:00"
  @IsString()
  @IsNotEmpty()
  trainingTime: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignedEmployeeDto)
  assignedEmployees?: AssignedEmployeeDto[];

  @IsOptional()
  @IsIn(['PENDING', 'ACTIVE', 'COMPLETED', 'POSTPONED'])
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'POSTPONED';

  @IsOptional()
  @IsString()
  trainer?: string;

  @IsOptional()
  @IsEnum(TrainingType)
  trainingType?: TrainingType;
}

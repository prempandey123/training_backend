import { IsArray, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TrainingType } from '../enums/training-type.enum';
import { TrainingCategory } from '../enums/training-category.enum';
import { TrainingSessionType } from '../enums/training-session-type.enum';

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

  @IsOptional()
  @IsString()
  venue?: string;

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

  /**
   * UI label: Mode (Internal/External/Online/...)
   * Backward compatible alias if frontend sends `mode`.
   */
  @IsOptional()
  @IsEnum(TrainingType)
  mode?: TrainingType;

  @IsOptional()
  @IsEnum(TrainingCategory)
  category?: TrainingCategory;

  @IsOptional()
  @IsEnum(TrainingSessionType)
  type?: TrainingSessionType;
}

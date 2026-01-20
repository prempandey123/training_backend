import { IsArray, IsEnum, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TrainingType } from '../enums/training-type.enum';
import { TrainingCategory } from '../enums/training-category.enum';
import { TrainingSessionType } from '../enums/training-session-type.enum';

class AttendeeDto {
  @IsString()
  empId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  dept?: string;

  @IsOptional()
  @IsIn(['ATTENDED', 'ABSENT'])
  status?: 'ATTENDED' | 'ABSENT';
}

export class UpdateTrainingDto {
  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsString()
  trainingDate?: string;

  @IsOptional()
  @IsString()
  trainingTime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  trainer?: string;

  @IsOptional()
  @IsIn(['PENDING', 'ACTIVE', 'COMPLETED', 'POSTPONED'])
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'POSTPONED';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendeeDto)
  attendees?: AttendeeDto[];

  @IsOptional()
  @IsString()
  postponeReason?: string;

  @IsOptional()
  @IsEnum(TrainingType)
  trainingType?: TrainingType;

  /**
   * UI label: Mode (alias for trainingType)
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

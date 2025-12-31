import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RequiredLevelItemDto {
  @IsInt()
  skillId: number;

  @IsInt()
  @Min(0)
  @Max(4)
  requiredLevel: number;
}

export class BulkSetRequiredLevelsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RequiredLevelItemDto)
  levels: RequiredLevelItemDto[];
}

import { IsIn, IsOptional } from 'class-validator';
import type { RequirementStatus } from '../training-requirement.entity';

export class UpdateTrainingRequirementDto {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'CLOSED'])
  status?: RequirementStatus;
}

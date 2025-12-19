import {
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsInt,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  employeeId: string;

  @IsNotEmpty()
  mobile: string;

  // 🔹 FK ids only (clean API)
  @IsInt()
  departmentId: number;

  @IsInt()
  designationId: number;

  @IsEnum(UserRole)
  role: UserRole;

  @IsDateString()
  dateOfJoining: string;
}

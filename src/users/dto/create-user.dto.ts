import {
  IsEmail,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { UserType } from '../enums/user-type.enum';

export class CreateUserDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  employeeId: string;

  @IsNotEmpty()
  mobile: string;

  // 🔐 password (required on create)
  @IsString()
  @MinLength(6)
  password: string;

  // 🔹 FK ids only (clean API)
  @IsInt()
  departmentId: number;

  @IsInt()
  designationId: number;

  @IsEnum(UserRole)
  role: UserRole;

  // Worker / Staff (HR must set for every user)
  @IsNotEmpty()
  @IsEnum(UserType)
  employeeType: UserType;

  @IsDateString()
  dateOfJoining: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  biometricLinked?: boolean;

}

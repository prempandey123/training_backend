import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
  IsNumber,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  employeeId: string;

  @IsNotEmpty()
  mobile: string;

  @IsNotEmpty()
  department: string;

  @IsIn(['ADMIN', 'EMPLOYEE'])
  role: 'ADMIN' | 'EMPLOYEE';

  @IsOptional()
  @IsBoolean()
  biometricLinked?: boolean;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

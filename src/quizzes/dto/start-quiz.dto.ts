import { IsInt, Matches } from 'class-validator';

export class StartQuizDto {
  @Matches(/^HSL\d{4}$/i, {
    message: 'Employee ID must be in HSL0000 format',
  })
  employeeId: string;

  @IsInt()
  quizId: number;
}

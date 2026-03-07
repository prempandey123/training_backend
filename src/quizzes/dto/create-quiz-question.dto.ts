import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { QuizOption } from '../enums/quiz-option.enum';

export class CreateQuizQuestionDto {
  @IsString()
  questionText: string;

  @IsString()
  optionA: string;

  @IsString()
  optionB: string;

  @IsString()
  optionC: string;

  @IsString()
  optionD: string;

  @IsEnum(QuizOption)
  correctOption: QuizOption;

  @IsOptional()
  @IsInt()
  @Min(1)
  marks?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;
}

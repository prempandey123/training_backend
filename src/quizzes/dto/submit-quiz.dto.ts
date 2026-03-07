import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { QuizOption } from '../enums/quiz-option.enum';

export class SubmitQuizAnswerDto {
  @IsInt()
  questionId: number;

  @IsEnum(QuizOption)
  selectedOption: QuizOption;
}

export class SubmitQuizDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitQuizAnswerDto)
  answers: SubmitQuizAnswerDto[];
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from './quiz.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { User } from '../users/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, QuizQuestion, QuizAttempt, User])],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}

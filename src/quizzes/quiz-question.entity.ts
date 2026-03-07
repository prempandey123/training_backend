import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { QuizOption } from './enums/quiz-option.enum';

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  quiz: Quiz;

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'text' })
  optionA: string;

  @Column({ type: 'text' })
  optionB: string;

  @Column({ type: 'text' })
  optionC: string;

  @Column({ type: 'text' })
  optionD: string;

  @Column({ type: 'enum', enum: QuizOption })
  correctOption: QuizOption;

  @Column({ type: 'int', default: 1 })
  marks: number;

  @Column({ type: 'int', default: 1 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}

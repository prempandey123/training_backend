import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { User } from '../users/users.entity';
import { QuizAttemptStatus } from './enums/quiz-attempt-status.enum';

@Entity('quiz_attempts')
export class QuizAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Quiz, (quiz) => quiz.attempts, { eager: true, onDelete: 'CASCADE' })
  quiz: Quiz;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  user?: User | null;

  @Column()
  employeeId: string;

  @Column()
  employeeName: string;

  @Column({ type: 'varchar', nullable: true })
departmentName?: string | null;

@Column({ type: 'varchar', nullable: true })
designationName?: string | null;

  @Column({ type: 'enum', enum: QuizAttemptStatus, default: QuizAttemptStatus.STARTED })
  status: QuizAttemptStatus;

  @Column({ type: 'jsonb', nullable: true })
  answers?: Array<{
    questionId: number;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    marksAwarded: number;
  }> | null;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', default: 0 })
  totalMarks: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentage: number;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

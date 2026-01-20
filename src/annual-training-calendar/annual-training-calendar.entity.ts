import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'annual_training_calendar' })
@Index(['trainingProgrammeCode', 'programmeName'], { unique: true })
export class AnnualTrainingCalendar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  srNo?: number | null;

  @Column({ type: 'varchar', length: 30 })
  trainingProgrammeCode: string;

  @Column({ type: 'varchar', length: 500 })
  programmeName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modeOfSession?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  facultyName?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  participants?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  department?: string | null;

  @Column({ type: 'int', default: 0 })
  apr25: number;
  @Column({ type: 'int', default: 0 })
  may25: number;
  @Column({ type: 'int', default: 0 })
  jun25: number;
  @Column({ type: 'int', default: 0 })
  jul25: number;
  @Column({ type: 'int', default: 0 })
  aug25: number;
  @Column({ type: 'int', default: 0 })
  sep25: number;
  @Column({ type: 'int', default: 0 })
  oct25: number;
  @Column({ type: 'int', default: 0 })
  nov25: number;
  @Column({ type: 'int', default: 0 })
  dec25: number;
  @Column({ type: 'int', default: 0 })
  jan26: number;
  @Column({ type: 'int', default: 0 })
  feb26: number;
  @Column({ type: 'int', default: 0 })
  mar26: number;

  @Column({ type: 'int', default: 0 })
  totalSessions: number;

  @Column({ type: 'int', default: 0 })
  overallSessions: number;

  @Column({ type: 'varchar', length: 20, default: '2025-26' })
  academicYear: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

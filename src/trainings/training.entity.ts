import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TrainingType } from './enums/training-type.enum';

export type TrainingStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'POSTPONED';

export interface TrainingAttendee {
  empId: string;
  name: string;
  dept?: string;
  status?: 'ATTENDED' | 'ABSENT';
}

@Entity({ name: 'trainings' })
export class Training {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  topic: string;


  @Column({
    type: 'enum',
    enum: TrainingType,
    enumName: 'training_type_enum',
    default: TrainingType.INTERNAL,
  })
  trainingType: TrainingType;

  /**
   * Compatibility alias used by some modules that still refer to `title`.
   * Not persisted to DB; simply mirrors `topic`.
   */
  get title(): string {
    return this.topic;
  }

  // Stored as DATE in DB, sent/received as ISO date string (YYYY-MM-DD)
  @Column({ type: 'date' })
  date: string;

  // UI uses "10:00 - 12:00"
  @Column({ type: 'varchar', length: 50 })
  time: string;

  // One or multiple departments
  @Column({ type: 'simple-json', nullable: true })
  departments?: string[];

  // Skills selected during assignment
  @Column({ type: 'simple-json', nullable: true })
  skills?: string[];

  // Employees assigned at time of creation (skill gap based selection)
  @Column({ type: 'simple-json', nullable: true })
  assignedEmployees?: Array<{ empId: string; name: string; dept?: string }>;

  // Attendance list (can be same as assignedEmployees, with status)
  @Column({ type: 'simple-json', nullable: true })
  attendees?: TrainingAttendee[];

  @Column({ type: 'varchar', length: 120, nullable: true })
  trainer?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: TrainingStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  postponeReason?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ✅ Email flags to prevent duplicate notifications
  @Column({ type: 'boolean', default: false })
  mailSentOnCreate: boolean;

  @Column({ type: 'boolean', default: false })
  mailSent1DayBefore: boolean;

  @Column({ type: 'boolean', default: false })
  mailSent1HourBefore: boolean;
}

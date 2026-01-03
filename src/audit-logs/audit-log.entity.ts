import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Department } from '../departments/department.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  // Who did it
  @ManyToOne(() => User, { nullable: true, eager: true })
  @Index()
  actor?: User;

  // Actor's department (denormalized via relation for easy filtering)
  @ManyToOne(() => Department, { nullable: true, eager: true })
  @Index()
  department?: Department;

  // What happened
  @Column({ length: 120 })
  action: string; // e.g. CREATE_USER, UPDATE_TRAINING, LOGIN

  @Column({ length: 120, nullable: true })
  entity?: string; // e.g. users, trainings

  @Column({ nullable: true })
  entityId?: string; // record id if known

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Request metadata
  @Column({ length: 10, nullable: true })
  method?: string;

  @Column({ type: 'text', nullable: true })
  path?: string;

  @Column({ nullable: true })
  statusCode?: number;

  @Column({ type: 'text', nullable: true })
  ip?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'jsonb', nullable: true })
  meta?: any;

  @CreateDateColumn()
  createdAt: Date;
}

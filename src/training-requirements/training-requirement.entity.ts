import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Skill } from '../skills/skill.entity';
import { Training } from '../trainings/training.entity';

export type RequirementPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type RequirementStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

@Entity('training_requirements')
@Unique(['user', 'skill', 'status'])
export class TrainingRequirement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @ManyToOne(() => Skill, { onDelete: 'CASCADE', eager: true })
  skill: Skill;

  @Column({ type: 'int' })
  requiredLevel: number;

  @Column({ type: 'int' })
  currentLevel: number;

  @Column({ type: 'int' })
  gap: number;

  @Column({ type: 'varchar', length: 10 })
  priority: RequirementPriority;

  @ManyToOne(() => Training, { onDelete: 'SET NULL', nullable: true, eager: true })
  suggestedTraining?: Training | null;

  // Fallback suggestion if there is no mapped/scheduled training yet
  @Column({ type: 'varchar', length: 255, nullable: true })
  suggestedTopic?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'OPEN' })
  status: RequirementStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

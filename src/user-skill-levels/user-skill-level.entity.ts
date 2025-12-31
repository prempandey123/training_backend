import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Skill } from '../skills/skill.entity';

@Entity('user_skill_levels')
@Unique(['user', 'skill']) // 🔒 one skill per user only
export class UserSkillLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @ManyToOne(() => Skill, { onDelete: 'CASCADE', eager: true })
  skill: Skill;

  @Column({ type: 'int' })
  currentLevel: number; // 0–4

  /**
   * ✅ User-wise required/target level for the same skill.
   * This enables different required levels for different users
   * even if they share the same designation.
   */
  @Column({ type: 'int', nullable: true })
  requiredLevel: number | null; // 0–4 (set by HR)

  @UpdateDateColumn()
  updatedAt: Date;
}

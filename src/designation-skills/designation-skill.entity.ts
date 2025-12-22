import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  JoinColumn,
} from 'typeorm';
import { Designation } from '../designations/designation.entity';
import { Skill } from '../skills/skill.entity';

@Entity('designation_skills')
@Unique(['designation', 'skill'])
export class DesignationSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Designation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'designation_id' })
  designation: Designation;

  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill: Skill;

  @Column({ type: 'int' })
  requiredLevel: number; // 0–4
}

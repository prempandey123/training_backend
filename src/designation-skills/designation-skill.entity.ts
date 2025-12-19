import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Designation } from '../designations/designation.entity';
import { Skill } from '../skills/skill.entity';

@Entity('designation_skills')
@Unique(['designation', 'skill']) // 🔒 no duplicate skill per designation
export class DesignationSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Designation, { onDelete: 'CASCADE' })
  designation: Designation;

  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  skill: Skill;

  @Column({ type: 'int' })
  requiredLevel: number; // 0–4
}

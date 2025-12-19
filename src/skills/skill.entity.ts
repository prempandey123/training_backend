import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToMany,
} from 'typeorm';
import { Designation } from '../designations/designation.entity';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  // 🔹 Skill ↔ Designation (MANY TO MANY)
  @ManyToMany(() => Designation, (designation) => designation.skills)
  designations: Designation[];

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

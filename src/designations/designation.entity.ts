import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { Department } from '../departments/department.entity';
import { Skill } from '../skills/skill.entity';
import { User } from '../users/users.entity';

@Entity('designations')
export class Designation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  designationName: string;

  @Column({ default: true })
  isActive: boolean;

  // 🔹 Designation ↔ Department (MANY TO MANY)
  @ManyToMany(() => Department)
  @JoinTable({
    name: 'department_designations',
    joinColumn: { name: 'designation_id' },
    inverseJoinColumn: { name: 'department_id' },
  })
  departments: Department[];

  // 🔹 Designation ↔ Skill (MANY TO MANY)
  // (Required level mapping will be in designation_skills table later)
  @ManyToMany(() => Skill)
  @JoinTable({
    name: 'designation_skills',
    joinColumn: { name: 'designation_id' },
    inverseJoinColumn: { name: 'skill_id' },
  })
  skills: Skill[];

  // 🔹 Designation → Users (ONE TO MANY)
  @OneToMany(() => User, (user) => user.designation)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

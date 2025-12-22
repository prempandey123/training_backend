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
import { User } from '../users/users.entity';
import { DesignationSkill } from '../designation-skills/designation-skill.entity';

@Entity('designations')
export class Designation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  designationName: string;

  @Column({ default: true })
  isActive: boolean;

  // 🔹 Designation ↔ Department
  @ManyToMany(() => Department)
  @JoinTable({
    name: 'department_designations',
    joinColumn: { name: 'designation_id' },
    inverseJoinColumn: { name: 'department_id' },
  })
  departments: Department[];

  // 🔹 Designation → DesignationSkill
  @OneToMany(
    () => DesignationSkill,
    (ds) => ds.designation,
  )
  designationSkills: DesignationSkill[];

  // 🔹 Designation → Users
  @OneToMany(() => User, (user) => user.designation)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

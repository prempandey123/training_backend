import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { UserRole } from './enums/user-role.enum';
import { UserType } from './enums/user-type.enum';
import { Department } from '../departments/department.entity';
import { Designation } from '../designations/designation.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  employeeId: string;

  @Column()
  mobile: string;

  // 🔐 hashed password (not selected by default)
  @Column({ nullable: true, select: false })
  password?: string;

  // 🔹 USER → DEPARTMENT (MANY TO ONE)
  @ManyToOne(() => Department, { eager: true })
  department: Department;

  // 🔹 USER → DESIGNATION (MANY TO ONE)
  @ManyToOne(() => Designation, (d) => d.users, {
    eager: true,
  })
  designation: Designation;

  @Column({
    type: 'enum',
    enum: UserType,
    nullable: true,
  })
  employeeType: UserType;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Column({ type: 'date' })
  dateOfJoining: Date;

  @Column({ default: false })
  biometricLinked: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

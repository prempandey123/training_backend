import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('designations')
export class Designation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  designationName: string;

  @Column('text', { array: true })
  skills: string[];

  @CreateDateColumn()
  createdAt: Date;
}

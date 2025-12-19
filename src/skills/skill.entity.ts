import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  department: string;

  @Column({ default: false })
  isCommon: boolean;

  @Column({ default: true })
  isActive: boolean;
}

import { Skill } from '../skills/skill.entity';
import { Training } from '../trainings/training.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('training_skills')
@Unique(['training', 'skill'])
export class TrainingSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Training, { onDelete: 'CASCADE' })
  training: Training;

  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  skill: Skill;

  @Column({ type: 'int' })
  improvementLevel: number; // 1–4
}

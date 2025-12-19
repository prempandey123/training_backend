import { Skill } from "src/skills/skill.entity";
import { Training } from "src/trainings/training.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";

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
  improvementLevel; // 1–4
}

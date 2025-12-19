import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillGapService } from '../skill-gap/skill-gap.service';
import { User } from '../users/users.entity';
import { TrainingSkill } from 'src/training_skills/training_skills.entity';

type SkillGapItem = {
  skillId: number;
  skillName: string;
  requiredLevel: number;
  currentLevel: number;
  gap: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
};

@Injectable()
export class TrainingRecommendationService {
  constructor(
    private readonly skillGapService: SkillGapService,

    @InjectRepository(TrainingSkill)
    private readonly trainingSkillRepo: Repository<TrainingSkill>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getUserTrainingRecommendations(userId: number) {
    // 1️⃣ Validate user
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2️⃣ Get skill gaps
    const gapData =
      await this.skillGapService.getUserSkillGap(userId);

    // 🔥 TYPE-SAFE FILTER (FIXES TS18047)
    const validGaps: SkillGapItem[] =
      gapData.skillGaps.filter(
        (gap): gap is SkillGapItem => gap !== null,
      );

    // 3️⃣ Prepare map
    const recommendations = new Map<
      number,
      {
        trainingId: number;
        title: string;
        priority: 'HIGH' | 'MEDIUM' | 'LOW';
        skillsCovered: string[];
      }
    >();

    // 4️⃣ Loop gaps (SAFE NOW)
    for (const gap of validGaps) {
      const trainings =
        await this.trainingSkillRepo.find({
          where: {
            skill: { id: gap.skillId },
          },
          relations: ['training', 'skill'],
        });

      for (const ts of trainings) {
        const existing =
          recommendations.get(ts.training.id);

        if (!existing) {
          recommendations.set(ts.training.id, {
            trainingId: ts.training.id,
            title: ts.training.title,
            priority: gap.priority,
            skillsCovered: [gap.skillName],
          });
        } else {
          existing.skillsCovered.push(gap.skillName);
        }
      }
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        employeeId: user.employeeId,
      },
      totalRecommendations: recommendations.size,
      recommendations: Array.from(recommendations.values()),
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { DesignationSkill } from '../designation-skills/designation-skill.entity';
import { UserSkillLevel } from '../user-skill-levels/user-skill-level.entity';
import {
  RequirementPriority,
  RequirementStatus,
  TrainingRequirement,
} from './training-requirement.entity';
import { TrainingSkill } from '../training_skills/training_skills.entity';

@Injectable()
export class TrainingRequirementsService {
  constructor(
    @InjectRepository(TrainingRequirement)
    private readonly reqRepo: Repository<TrainingRequirement>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(DesignationSkill)
    private readonly designationSkillRepo: Repository<DesignationSkill>,

    @InjectRepository(UserSkillLevel)
    private readonly userSkillRepo: Repository<UserSkillLevel>,

    @InjectRepository(TrainingSkill)
    private readonly trainingSkillRepo: Repository<TrainingSkill>,
  ) {}

  private getPriority(gap: number): RequirementPriority {
    if (gap >= 2) return 'HIGH';
    if (gap === 1) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Auto-create / refresh requirements for a user based on (required - current) gaps.
   * - Creates/updates OPEN requirements for positive gaps
   * - Optionally closes existing OPEN/IN_PROGRESS requirements when the gap is resolved
   */
  async autoCreateForUser(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['designation', 'department'],
    });
    if (!user) throw new NotFoundException('User not found');

    const designationSkills = await this.designationSkillRepo.find({
      where: { designation: { id: user.designation.id } },
      relations: ['skill'],
    });

    const userSkills = await this.userSkillRepo.find({
      where: { user: { id: user.id } },
    });
    const userSkillMap = new Map(userSkills.map((u) => [u.skill.id, u.currentLevel]));

    const openExisting = await this.reqRepo.find({
      where: {
        user: { id: user.id },
        status: 'OPEN',
      },
    });
    const inProgressExisting = await this.reqRepo.find({
      where: {
        user: { id: user.id },
        status: 'IN_PROGRESS',
      },
    });
    const activeExisting = [...openExisting, ...inProgressExisting];

    // Build requirements from gaps
    const createdOrUpdated: TrainingRequirement[] = [];
    const resolvedSkillIds = new Set<number>();

    for (const ds of designationSkills) {
      const currentLevel = userSkillMap.get(ds.skill.id) ?? 0;
      const gap = ds.requiredLevel - currentLevel;

      if (gap <= 0) {
        resolvedSkillIds.add(ds.skill.id);
        continue;
      }

      const priority = this.getPriority(gap);

      // Find best mapped training for this skill
      const mappings = await this.trainingSkillRepo.find({
        where: { skill: { id: ds.skill.id } },
        relations: ['training', 'skill'],
      });

      const today = new Date();
      const todayIso = today.toISOString().slice(0, 10); // YYYY-MM-DD

      // Prefer upcoming training, then latest mapping
      const sorted = mappings
        .filter((m) => m?.training)
        .sort((a, b) => {
          const ad = a.training?.date ?? '';
          const bd = b.training?.date ?? '';

          const aUpcoming = ad >= todayIso;
          const bUpcoming = bd >= todayIso;

          if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
          // If both upcoming or both past, pick nearest upcoming / most recent past
          return ad.localeCompare(bd);
        });

      const best = sorted[0] ?? null;

      // Find existing active requirement (OPEN or IN_PROGRESS) for same skill
      const existing = activeExisting.find((r) => r.skill?.id === ds.skill.id);

      const req = existing ?? this.reqRepo.create();
      req.user = user;
      req.skill = ds.skill;
      req.requiredLevel = ds.requiredLevel;
      req.currentLevel = currentLevel;
      req.gap = gap;
      req.priority = priority;
      req.status = (existing?.status as RequirementStatus) ?? 'OPEN';

      if (best?.training) {
        req.suggestedTraining = best.training;
        req.suggestedTopic = null;
      } else {
        req.suggestedTraining = null;
        req.suggestedTopic = `Training for ${ds.skill.name}`;
      }

      const saved = await this.reqRepo.save(req);
      createdOrUpdated.push(saved);
    }

    // Close resolved requirements (gap <= 0)
    const toClose = activeExisting.filter((r) => resolvedSkillIds.has(r.skill?.id));
    for (const r of toClose) {
      r.status = 'CLOSED';
      await this.reqRepo.save(r);
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        employeeId: user.employeeId,
        designation: user.designation?.designationName,
        department: user.department?.name,
      },
      createdOrUpdated: createdOrUpdated.map((r) => this.toUi(r)),
      closedCount: toClose.length,
    };
  }

  async listForUser(userId: number, status?: RequirementStatus) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const where: any = { user: { id: userId } };
    if (status) where.status = status;

    const list = await this.reqRepo.find({
      where,
      order: { priority: 'DESC', updatedAt: 'DESC' },
    });
    return list.map((r) => this.toUi(r));
  }

  async updateStatus(id: number, status: RequirementStatus) {
    const req = await this.reqRepo.findOne({ where: { id } });
    if (!req) throw new NotFoundException('Requirement not found');
    req.status = status;
    const saved = await this.reqRepo.save(req);
    return this.toUi(saved);
  }

  private toUi(r: TrainingRequirement) {
    return {
      id: r.id,
      userId: r.user?.id,
      skillId: r.skill?.id,
      skillName: r.skill?.name,
      requiredLevel: r.requiredLevel,
      currentLevel: r.currentLevel,
      gap: r.gap,
      priority: r.priority,
      status: r.status,
      suggestedTraining: r.suggestedTraining
        ? {
            id: r.suggestedTraining.id,
            topic: r.suggestedTraining.topic,
            date: r.suggestedTraining.date,
            time: r.suggestedTraining.time,
            trainer: r.suggestedTraining.trainer,
            status: r.suggestedTraining.status,
          }
        : null,
      suggestedTopic: r.suggestedTopic ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}

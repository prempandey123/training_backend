import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  // ✅ normalize date (string/Date) to YYYY-MM-DD
  private toYmd(val: any): string | null {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    const s = String(val);
    // if already "YYYY-MM-DD..." take first 10
    return s.length >= 10 ? s.slice(0, 10) : s;
  }

  /**
   * Auto-create / refresh requirements for a user based on (required - current) gaps.
   * - Creates/updates OPEN requirements for positive gaps
   * - Closes existing OPEN/IN_PROGRESS requirements when the gap is resolved
   */
  async autoCreateForUser(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['designation', 'department'],
    });
    if (!user) throw new NotFoundException('User not found');

    // ✅ If designation missing, don't crash
    if (!user.designation?.id) {
      throw new BadRequestException('User designation not assigned');
      // (Agar tum empty return chahte ho instead of error, bol dena; but yeh safer hai)
    }

    const designationSkills = await this.designationSkillRepo.find({
      where: { designation: { id: user.designation.id } },
      relations: ['skill'],
    });

    // ✅ FIX: relations: ['skill'] needed, warna u.skill undefined -> 500
    const userSkills = await this.userSkillRepo.find({
      where: { user: { id: user.id } },
      relations: ['skill'],
    });

    const userSkillMap = new Map<number, number>(
      userSkills
        .filter((u) => u?.skill?.id != null)
        .map((u) => [u.skill.id, u.currentLevel]),
    );

    const userRequiredMap = new Map<number, number>(
      userSkills
        .filter((u) => u?.skill?.id != null)
        .map((u) => [u.skill.id, u.requiredLevel ?? 0]),
    );

    // ✅ load relations so skill/suggestedTraining available when matching & toUi
    const openExisting = await this.reqRepo.find({
      where: { user: { id: user.id }, status: 'OPEN' },
      relations: ['skill', 'suggestedTraining', 'user'],
    });

    const inProgressExisting = await this.reqRepo.find({
      where: { user: { id: user.id }, status: 'IN_PROGRESS' },
      relations: ['skill', 'suggestedTraining', 'user'],
    });

    const activeExisting = [...openExisting, ...inProgressExisting];

    const createdOrUpdated: TrainingRequirement[] = [];
    const resolvedSkillIds = new Set<number>();

    const todayIso = this.toYmd(new Date())!;

    for (const ds of designationSkills) {
      if (!ds?.skill?.id) continue;

      const currentLevel = userSkillMap.get(ds.skill.id) ?? 0;
      // ✅ Required level is user-specific (fallback to designation mapping if present)
      const requiredLevel = 4;
      if (requiredLevel === null || requiredLevel === undefined) {
        // HR hasn't set this user's required level for the skill yet
        continue;
      }
      const gap = requiredLevel - currentLevel;

      if (gap <= 0) {
        resolvedSkillIds.add(ds.skill.id);
        continue;
      }

      const priority = this.getPriority(gap);

      const mappings = await this.trainingSkillRepo.find({
        where: { skill: { id: ds.skill.id } },
        relations: ['training', 'skill'],
      });

      // ✅ Prefer upcoming training; compare using normalized YYYY-MM-DD
      const sorted = mappings
        .filter((m) => m?.training)
        .sort((a, b) => {
          const ad = this.toYmd(a.training?.date) ?? '';
          const bd = this.toYmd(b.training?.date) ?? '';

          const aUpcoming = ad >= todayIso;
          const bUpcoming = bd >= todayIso;

          if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;

          // both upcoming/past -> pick nearest (for upcoming) / most recent (for past)
          // For this, descending works better for past; for upcoming ascending works better.
          // We'll do: upcoming => ascending; past => descending
          if (aUpcoming && bUpcoming) return ad.localeCompare(bd); // nearest upcoming
          return bd.localeCompare(ad); // most recent past
        });

      const best = sorted[0] ?? null;

      // Find existing active requirement (OPEN or IN_PROGRESS) for same skill
      const existing = activeExisting.find((r) => r.skill?.id === ds.skill.id);

      const req = existing ?? this.reqRepo.create();
      req.user = user;
      req.skill = ds.skill;
      req.requiredLevel = requiredLevel;
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
      relations: ['user', 'skill', 'suggestedTraining'],
      order: { priority: 'DESC', updatedAt: 'DESC' },
    });

    return list.map((r) => this.toUi(r));
  }

  async updateStatus(id: number, status: RequirementStatus) {
    const req = await this.reqRepo.findOne({
      where: { id },
      relations: ['user', 'skill', 'suggestedTraining'],
    });
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

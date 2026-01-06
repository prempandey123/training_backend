import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { DesignationSkill } from '../designation-skills/designation-skill.entity';
import { UserSkillLevel } from '../user-skill-levels/user-skill-level.entity';

@Injectable()
export class SkillMatrixService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(DesignationSkill)
    private readonly designationSkillRepo: Repository<DesignationSkill>,
    @InjectRepository(UserSkillLevel)
    private readonly userSkillRepo: Repository<UserSkillLevel>,
  ) {}

  async getUserSkillMatrix(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['department', 'designation'], // ✅ department add
    });

    if (!user) throw new NotFoundException('User not found');

    const designationSkills = await this.designationSkillRepo.find({
      where: { designation: { id: user.designation.id } },
      relations: ['skill'],
    });

    const userSkillLevels = await this.userSkillRepo.find({
      where: { user: { id: user.id } },
      relations: ['skill'], // ✅ so u.skill.id works reliably
    });

    // NOTE:
    // Skills are soft-deleted in the system. When a Skill is soft-deleted,
    // TypeORM will NOT load it in relations by default, so `u.skill` (or `ds.skill`)
    // can become `null`. We must guard against that to avoid runtime errors.
    const userSkillMap = new Map<number, number>(
      userSkillLevels
        .filter((u) => !!u.skill)
        .map((u) => [u.skill.id, u.currentLevel]),
    );

    const userRequiredMap = new Map<number, number | null>(
      userSkillLevels
        .filter((u) => !!u.skill)
        .map((u) => [u.skill.id, u.requiredLevel ?? null]),
    );

    let totalRequiredScore = 0;
    let totalCurrentScore = 0;

    const skills = designationSkills
      .filter((ds) => !!ds.skill)
      .map((ds) => {
      // ✅ Required level is user-wise (set by HR). If not set yet, treat as N/A.
      const requiredLevel = 4;
      const currentLevel = userSkillMap.get(ds.skill.id) ?? 0;
      totalRequiredScore += requiredLevel;
      totalCurrentScore += currentLevel;

      return {
        skillId: ds.skill.id,
        skillName: ds.skill.name,
        requiredLevel,
        currentLevel,
        gap: requiredLevel == null ? null : requiredLevel - currentLevel,
      };
      });

    const completionPercentage =
      totalRequiredScore === 0
        ? 0
        : Math.round((totalCurrentScore / totalRequiredScore) * 100);

    return {
      user: {
        id: user.id,
        name: user.name,
        employeeId: user.employeeId,
        department: user.department?.name ?? null,
        designation: user.designation?.designationName ?? null,
      },
      summary: {
        totalSkills: skills.length,
        totalRequiredScore,
        totalCurrentScore,
        completionPercentage,
      },
      skills,
    };
  }

  // ✅ Org matrix for ALL employees together
  async getOrgSkillMatrix(filters: {
    departmentId?: number;
    designationId?: number;
    q?: string;
    employeeType?: string;
  }) {
    const where: any = { isActive: true };

    if (filters.departmentId) where.department = { id: filters.departmentId };
    if (filters.designationId) where.designation = { id: filters.designationId };
    if (filters.employeeType) where.employeeType = String(filters.employeeType).toUpperCase();
    if (filters.employeeType) where.employeeType = filters.employeeType;

    let users = await this.userRepo.find({
      where,
      relations: ['department', 'designation'],
      order: { name: 'ASC' },
    });

    if (filters.q) {
      const q = filters.q.toLowerCase();
      users = users.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.employeeId?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q),
      );
    }

    const userIds = users.map((u) => u.id);
    const designationIds = Array.from(
      new Set(users.map((u) => u.designation?.id).filter(Boolean)),
    ) as number[];

    // Skills mapped to each designation (used to build the canonical skill list)
    const designationSkills =
      designationIds.length > 0
        ? await this.designationSkillRepo.find({
            where: { designation: { id: In(designationIds) } },
            relations: ['skill', 'designation'],
          })
        : [];

    // Canonical skill list (union across shown users)
    const skillMap = new Map<number, { id: number; name: string }>();
    for (const ds of designationSkills) {
      // If the related Skill (or Designation) is soft-deleted, relation may be null.
      // Skip it so matrices don't crash / show deleted skills.
      if (!ds.skill || !ds.designation) continue;
      const skillId = ds.skill.id;
      skillMap.set(skillId, { id: skillId, name: ds.skill.name });
    }

    const skills = Array.from(skillMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    // current skill levels per user
    const userSkillLevels =
      userIds.length > 0
        ? await this.userSkillRepo.find({
            where: { user: { id: In(userIds) } },
            relations: ['user', 'skill'], // ✅ IMPORTANT
          })
        : [];

    const currentMap = new Map<string, number>(); // `${userId}:${skillId}`
    const requiredUserMap = new Map<string, number | null>(); // `${userId}:${skillId}`
    for (const usl of userSkillLevels) {
      // Same issue: when Skill is soft-deleted, relation may be null.
      if (!usl.user || !usl.skill) continue;
      currentMap.set(`${usl.user.id}:${usl.skill.id}`, usl.currentLevel);
      requiredUserMap.set(`${usl.user.id}:${usl.skill.id}`, usl.requiredLevel ?? null);
    }

    // Build employee rows
    const employees = users.map((u) => {
      const designationId = u.designation?.id;

      let totalReq = 0;
      let totalCur = 0;

      const cells = skills.map((s) => {
        // ✅ Required level is user-wise (set by HR). If missing, treat as N/A.
        const required = 4;

        const current = currentMap.get(`${u.id}:${s.id}`) ?? 0;

        totalReq += required;
        totalCur += current;

        return {
          skillId: s.id,
          requiredLevel: required,
          currentLevel: current,
          gap: required == null ? null : required - current,
        };
      });

      const completion =
        totalReq === 0 ? 0 : Math.round((totalCur / totalReq) * 100);

      return {
        id: u.id,
        name: u.name,
        employeeId: u.employeeId,
        email: u.email,
        department: u.department?.name ?? null,
        designation: u.designation?.designationName ?? null,
        completionPercentage: completion,
        cells,
      };
    });

    return { skills, employees };
  }
}

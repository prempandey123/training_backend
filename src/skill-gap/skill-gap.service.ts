import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { DesignationSkill } from '../designation-skills/designation-skill.entity';
import { UserSkillLevel } from '../user-skill-levels/user-skill-level.entity';

@Injectable()
export class SkillGapService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(DesignationSkill)
    private readonly designationSkillRepo: Repository<DesignationSkill>,

    @InjectRepository(UserSkillLevel)
    private readonly userSkillRepo: Repository<UserSkillLevel>,
  ) {}

  /**
   * Priority mapping (as requested):
   * - currentLevel 0 or 1  => HIGH
   * - currentLevel 2       => MEDIUM (Moderate)
   * - currentLevel 3+      => LOW
   */
  private getPriorityFromCurrentLevel(
    currentLevel: number,
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (currentLevel <= 1) return 'HIGH';
    if (currentLevel === 2) return 'MEDIUM';
    return 'LOW';
  }

  async getUserSkillGap(userId: number) {
    // 1️⃣ Fetch user
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['designation', 'department'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2️⃣ Fetch designation skills
    const designationSkills =
      await this.designationSkillRepo.find({
        where: {
          designation: { id: user.designation.id },
        },
        relations: ['skill'],
      });

    const validDesignationSkills = designationSkills.filter(
      (ds) => ds.skill && ds.skill.id,
    );

    // 3️⃣ Fetch user skill levels
    const userSkills = await this.userSkillRepo.find({
      where: { user: { id: user.id } },
      relations: ['skill'],
    });

    const userSkillMap = new Map(
      userSkills
        .filter((u) => u.skill && u.skill.id)
        .map((u) => [u.skill.id, u.currentLevel]),
    );

    const userRequiredMap = new Map(
      userSkills
        .filter((u) => u.skill && u.skill.id)
        .map((u) => [u.skill.id, u.requiredLevel ?? null]),
    );

    let high = 0;
    let medium = 0;
    let low = 0;

    // 4️⃣ Calculate gaps
    const skillGaps = validDesignationSkills
      .map((ds) => {
        const currentLevel =
          userSkillMap.get(ds.skill.id) ?? 0;
        const requiredLevel = userRequiredMap.get(ds.skill.id);
        if (requiredLevel === null || requiredLevel === undefined) return null;
        const gap = requiredLevel - currentLevel;

        if (gap <= 0) return null;

        const priority = this.getPriorityFromCurrentLevel(currentLevel);

        if (priority === 'HIGH') high++;
        if (priority === 'MEDIUM') medium++;
        if (priority === 'LOW') low++;

        return {
          skillId: ds.skill.id,
          skillName: ds.skill.name,
          requiredLevel,
          currentLevel,
          gap,
          priority,
        };
      })
      .filter(Boolean);

    return {
      user: {
        id: user.id,
        name: user.name,
        employeeId: user.employeeId,
        designation: user.designation.designationName,
        department: user.department.name,
      },
      summary: {
        totalSkills: validDesignationSkills.length,
        gapSkills: skillGaps.length,
        highPriority: high,
        mediumPriority: medium,
        lowPriority: low,
      },
      skillGaps,
    };
  }
  async getDepartmentSkillGap(departmentId: number) {
  // 1️⃣ Fetch users of department
  const users = await this.userRepo.find({
    where: {
      department: { id: departmentId },
    },
    relations: ['designation'],
  });

  if (!users.length) {
    throw new NotFoundException(
      'No users found in this department',
    );
  }

  const skillGapMap = new Map<
    number,
    {
      skillId: number;
      skillName: string;
      totalGap: number;
      totalCurrentLevel: number;
      employeesAffected: number;
    }
  >();

  let high = 0;
  let medium = 0;
  let low = 0;

  // 2️⃣ Loop users
  for (const user of users) {
    // Designation skills
    const designationSkills =
      await this.designationSkillRepo.find({
        where: {
          designation: { id: user.designation.id },
        },
        relations: ['skill'],
      });

    const validDesignationSkills = designationSkills.filter(
      (ds) => ds.skill && ds.skill.id,
    );

    // User skill levels
    const userSkills = await this.userSkillRepo.find({
      where: { user: { id: user.id } },
      relations: ['skill'],
    });

    const userSkillMap = new Map(
      userSkills
        .filter((u) => u.skill && u.skill.id)
        .map((u) => [u.skill.id, u.currentLevel]),
    );

    const userRequiredMap = new Map(
      userSkills
        .filter((u) => u.skill && u.skill.id)
        .map((u) => [u.skill.id, u.requiredLevel ?? null]),
    );

    // 3️⃣ Calculate gap
    for (const ds of validDesignationSkills) {
      const currentLevel =
        userSkillMap.get(ds.skill.id) ?? 0;
      const requiredLevel = userRequiredMap.get(ds.skill.id);
      if (requiredLevel === null || requiredLevel === undefined) continue;
      const gap = requiredLevel - currentLevel;

      if (gap <= 0) continue;

      const existing = skillGapMap.get(ds.skill.id);

      if (!existing) {
        skillGapMap.set(ds.skill.id, {
          skillId: ds.skill.id,
          skillName: ds.skill.name,
          totalGap: gap,
          totalCurrentLevel: currentLevel,
          employeesAffected: 1,
        });
      } else {
        existing.totalGap += gap;
        existing.totalCurrentLevel += currentLevel;
        existing.employeesAffected += 1;
      }

      // Priority counts based on CURRENT level (0/1 High, 2 Moderate, 3+ Low)
      const p = this.getPriorityFromCurrentLevel(currentLevel);
      if (p === 'HIGH') high++;
      else if (p === 'MEDIUM') medium++;
      else low++;
    }
  }

  // 4️⃣ Prepare response
  const skillGaps = Array.from(skillGapMap.values()).map(
    (s) => {
      const avgGap =
        s.totalGap / s.employeesAffected;

      // Department priority derived from average CURRENT level across affected employees
      const avgCurrentLevel =
        s.totalCurrentLevel / s.employeesAffected;

      let priority: 'HIGH' | 'MEDIUM' | 'LOW';
      if (avgCurrentLevel < 2) priority = 'HIGH';
      else if (avgCurrentLevel < 3) priority = 'MEDIUM';
      else priority = 'LOW';

      return {
        skillId: s.skillId,
        skillName: s.skillName,
        employeesAffected: s.employeesAffected,
        averageGap: Number(avgGap.toFixed(1)),
        averageCurrentLevel: Number(avgCurrentLevel.toFixed(1)),
        priority,
      };
    },
  );

  return {
    department: {
      id: departmentId,
    },
    summary: {
      totalEmployees: users.length,
      totalSkills: skillGaps.length,
      highPriority: high,
      mediumPriority: medium,
      lowPriority: low,
    },
    skillGaps,
  };
}

}

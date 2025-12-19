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

  private getPriority(gap: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (gap >= 2) return 'HIGH';
    if (gap === 1) return 'MEDIUM';
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

    // 3️⃣ Fetch user skill levels
    const userSkills = await this.userSkillRepo.find({
      where: { user: { id: user.id } },
    });

    const userSkillMap = new Map(
      userSkills.map((u) => [u.skill.id, u.currentLevel]),
    );

    let high = 0;
    let medium = 0;
    let low = 0;

    // 4️⃣ Calculate gaps
    const skillGaps = designationSkills
      .map((ds) => {
        const currentLevel =
          userSkillMap.get(ds.skill.id) ?? 0;
        const gap = ds.requiredLevel - currentLevel;

        if (gap <= 0) return null;

        const priority = this.getPriority(gap);

        if (priority === 'HIGH') high++;
        if (priority === 'MEDIUM') medium++;
        if (priority === 'LOW') low++;

        return {
          skillId: ds.skill.id,
          skillName: ds.skill.name,
          requiredLevel: ds.requiredLevel,
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
        totalSkills: designationSkills.length,
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

    // User skill levels
    const userSkills = await this.userSkillRepo.find({
      where: { user: { id: user.id } },
    });

    const userSkillMap = new Map(
      userSkills.map((u) => [u.skill.id, u.currentLevel]),
    );

    // 3️⃣ Calculate gap
    for (const ds of designationSkills) {
      const currentLevel =
        userSkillMap.get(ds.skill.id) ?? 0;
      const gap = ds.requiredLevel - currentLevel;

      if (gap <= 0) continue;

      const existing = skillGapMap.get(ds.skill.id);

      if (!existing) {
        skillGapMap.set(ds.skill.id, {
          skillId: ds.skill.id,
          skillName: ds.skill.name,
          totalGap: gap,
          employeesAffected: 1,
        });
      } else {
        existing.totalGap += gap;
        existing.employeesAffected += 1;
      }

      if (gap >= 2) high++;
      else if (gap === 1) medium++;
      else low++;
    }
  }

  // 4️⃣ Prepare response
  const skillGaps = Array.from(skillGapMap.values()).map(
    (s) => {
      const avgGap =
        s.totalGap / s.employeesAffected;

      let priority: 'HIGH' | 'MEDIUM' | 'LOW';
      if (avgGap >= 2) priority = 'HIGH';
      else if (avgGap >= 1) priority = 'MEDIUM';
      else priority = 'LOW';

      return {
        skillId: s.skillId,
        skillName: s.skillName,
        employeesAffected: s.employeesAffected,
        averageGap: Number(avgGap.toFixed(1)),
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

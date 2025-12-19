import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { DesignationSkill } from '../designation-skills/designation-skill.entity';
import { UserSkillLevel } from '../user-skill-levels/user-skill-level.entity';

@Injectable()
export class SkillMatrixService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(DesignationSkill)
    private readonly designationSkillRepo: Repository<DesignationSkill>,

    @InjectRepository(UserSkillLevel)
    private readonly userSkillRepo: Repository<UserSkillLevel>,
  ) {}

  async getUserSkillMatrix(userId: number) {
    // 1️⃣ Fetch user with designation
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['designation'],
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
    const userSkillLevels = await this.userSkillRepo.find({
      where: {
        user: { id: user.id },
      },
    });

    // Map for fast lookup
    const userSkillMap = new Map(
      userSkillLevels.map((u) => [
        u.skill.id,
        u.currentLevel,
      ]),
    );

    let totalRequiredScore = 0;
    let totalCurrentScore = 0;

    // 4️⃣ Merge + calculate gap
    const skills = designationSkills.map((ds) => {
      const requiredLevel = ds.requiredLevel;
      const currentLevel =
        userSkillMap.get(ds.skill.id) ?? 0;

      totalRequiredScore += requiredLevel;
      totalCurrentScore += currentLevel;

      return {
        skillId: ds.skill.id,
        skillName: ds.skill.name,
        requiredLevel,
        currentLevel,
        gap: requiredLevel - currentLevel,
      };
    });

    // 5️⃣ Completion %
    const completionPercentage =
      totalRequiredScore === 0
        ? 0
        : Math.round(
            (totalCurrentScore /
              totalRequiredScore) *
              100,
          );

    return {
      user: {
        id: user.id,
        name: user.name,
        employeeId: user.employeeId,
        department: user.department.name,
        designation: user.designation.designationName,
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
}

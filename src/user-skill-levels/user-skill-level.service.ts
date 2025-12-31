import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSkillLevel } from './user-skill-level.entity';
import { User } from '../users/users.entity';
import { Skill } from '../skills/skill.entity';
import { DesignationSkill } from '../designation-skills/designation-skill.entity';
import { CreateUserSkillLevelDto } from './dto/create-user-skill-level.dto';
import { UpdateUserSkillLevelDto } from './dto/update-user-skill-level.dto';

@Injectable()
export class UserSkillLevelService {
  constructor(
    @InjectRepository(UserSkillLevel)
    private readonly uslRepo: Repository<UserSkillLevel>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,

    @InjectRepository(DesignationSkill)
    private readonly designationSkillRepo: Repository<DesignationSkill>,
  ) {}

  private assertLevelRange(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 4) {
      throw new BadRequestException('currentLevel must be an integer between 0 and 4');
    }
  }

  private assertRequiredLevelRange(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 4) {
      throw new BadRequestException('requiredLevel must be an integer between 0 and 4');
    }
  }

  private async assertSkillAllowedForUser(user: User, skill: Skill) {
    const ok = await this.designationSkillRepo.findOne({
      where: {
        designation: { id: user.designation.id },
        skill: { id: skill.id },
      },
    });
    if (!ok) {
      throw new BadRequestException('Skill not allowed for this user designation');
    }
  }

  // CREATE / UPSERT USER SKILL LEVEL
  async create(dto: CreateUserSkillLevelDto) {
    this.assertLevelRange(dto.currentLevel);
    if (dto.requiredLevel !== undefined) {
      this.assertRequiredLevelRange(dto.requiredLevel);
    }

    const user = await this.userRepo.findOne({
      where: { id: dto.userId },
      relations: ['designation'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skill = await this.skillRepo.findOne({
      where: { id: dto.skillId },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    // 🔒 VALIDATION: skill must exist in designation_skills
    await this.assertSkillAllowedForUser(user, skill);

    // 🔁 UPSERT LOGIC
    let userSkill = await this.uslRepo.findOne({
      where: {
        user: { id: user.id },
        skill: { id: skill.id },
      },
    });

    if (!userSkill) {
      userSkill = this.uslRepo.create({
        user,
        skill,
        currentLevel: dto.currentLevel,
        requiredLevel: dto.requiredLevel ?? null,
      });
    } else {
      userSkill.currentLevel = dto.currentLevel;
      if (dto.requiredLevel !== undefined) {
        userSkill.requiredLevel = dto.requiredLevel;
      }
    }

    return this.uslRepo.save(userSkill);
  }

  // ✅ EMPLOYEE FRIENDLY: UPSERT OWN SKILL LEVEL (no userId in payload)
  async upsertForUser(userId: number, skillId: number, currentLevel: number) {
    this.assertLevelRange(currentLevel);

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['designation'],
    });
    if (!user) throw new NotFoundException('User not found');

    const skill = await this.skillRepo.findOne({
      where: { id: skillId },
    });
    if (!skill) throw new NotFoundException('Skill not found');

    await this.assertSkillAllowedForUser(user, skill);

    let userSkill = await this.uslRepo.findOne({
      where: {
        user: { id: user.id },
        skill: { id: skill.id },
      },
    });

    if (!userSkill) {
      userSkill = this.uslRepo.create({
        user,
        skill,
        currentLevel,
        requiredLevel: null,
      });
    } else {
      userSkill.currentLevel = currentLevel;
    }

    return this.uslRepo.save(userSkill);
  }

  // GET ALL SKILLS FOR USER
  async findByUser(userId: number) {
    return this.uslRepo.find({
      where: {
        user: { id: userId },
      },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * ✅ Bulk set required levels for a user.
   * - Skill list is validated against user's designation.
   * - Creates row if missing (currentLevel defaults to 0).
   */
  async bulkSetRequiredLevels(
    userId: number,
    levels: Array<{ skillId: number; requiredLevel: number }>,
  ) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['designation'],
    });
    if (!user) throw new NotFoundException('User not found');

    // ✅ Force HR to set required level for every designation skill
    const designationSkills = await this.designationSkillRepo.find({
      where: { designation: { id: user.designation.id } },
      relations: ['skill'],
    });

    const designationSkillIds = new Set(
      designationSkills.filter((ds) => ds.skill?.id).map((ds) => ds.skill.id),
    );
    const providedSkillIds = new Set(levels.map((l) => l.skillId));

    const missing = Array.from(designationSkillIds).filter(
      (id) => !providedSkillIds.has(id),
    );

    if (missing.length > 0) {
      throw new BadRequestException(
        `Required levels missing for ${missing.length} skill(s). Please set required level for all skills in this user's designation. Missing skillIds: ${missing.join(', ')}`,
      );
    }

    const results: UserSkillLevel[] = [];

    for (const item of levels) {
      this.assertRequiredLevelRange(item.requiredLevel);

      const skill = await this.skillRepo.findOne({ where: { id: item.skillId } });
      if (!skill) throw new NotFoundException(`Skill not found: ${item.skillId}`);

      await this.assertSkillAllowedForUser(user, skill);

      let userSkill = await this.uslRepo.findOne({
        where: { user: { id: user.id }, skill: { id: skill.id } },
      });

      if (!userSkill) {
        userSkill = this.uslRepo.create({
          user,
          skill,
          currentLevel: 0,
          requiredLevel: item.requiredLevel,
        });
      } else {
        userSkill.requiredLevel = item.requiredLevel;
      }

      results.push(await this.uslRepo.save(userSkill));
    }

    return results;
  }

  /**
   * ✅ For training assignment: list users whose current level for a skill is below a threshold.
   * - Users with no entry for the skill are treated as level 0.
   */
  async findUsersBySkillUnderLevel(
    skillId: number,
    maxLevel: number = 3,
    activeOnly: boolean = true,
  ) {
    // validate range (frontend asks: below 4 -> maxLevel=3)
    if (!Number.isInteger(maxLevel) || maxLevel < 0 || maxLevel > 4) {
      throw new BadRequestException('maxLevel must be an integer between 0 and 4');
    }

    // ensure skill exists (nice error vs empty list confusion)
    const skill = await this.skillRepo.findOne({ where: { id: skillId } });
    if (!skill) throw new NotFoundException('Skill not found');

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoin('user_skill_levels', 'usl', 'usl.userId = user.id AND usl.skillId = :skillId', { skillId })
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('user.designation', 'designation')
      .addSelect('COALESCE(usl.currentLevel, 0)', 'currentLevel')
      .where('COALESCE(usl.currentLevel, 0) <= :maxLevel', { maxLevel })
      .orderBy('user.name', 'ASC');

    if (activeOnly) {
      qb.andWhere('user.isActive = :active', { active: true });
    }

    const rows = await qb.getRawAndEntities();

    // map raw currentLevel back onto entities
    return rows.entities.map((u, idx) => {
      const raw = rows.raw[idx];
      const level = Number(raw?.currentLevel ?? 0);
      return {
        userId: u.id,
        employeeId: u.employeeId,
        name: u.name,
        department: u.department?.name,
        designation: u.designation?.designationName,
        currentLevel: Number.isFinite(level) ? level : 0,
      };
    });
  }

  // UPDATE LEVEL ONLY
  async update(id: number, dto: UpdateUserSkillLevelDto) {
    const userSkill = await this.uslRepo.findOne({
      where: { id },
    });

    if (!userSkill) {
      throw new NotFoundException(
        'User skill level not found',
      );
    }

    if (dto.currentLevel !== undefined) {
      this.assertLevelRange(dto.currentLevel);

      // 🔒 keep rule intact even on update
      const user = await this.userRepo.findOne({
        where: { id: userSkill.user.id },
        relations: ['designation'],
      });
      if (!user) throw new NotFoundException('User not found');

      const skill = await this.skillRepo.findOne({
        where: { id: userSkill.skill.id },
      });
      if (!skill) throw new NotFoundException('Skill not found');

      await this.assertSkillAllowedForUser(user, skill);

      userSkill.currentLevel = dto.currentLevel;
    }

    if (dto.requiredLevel !== undefined) {
      this.assertRequiredLevelRange(dto.requiredLevel);

      const user = await this.userRepo.findOne({
        where: { id: userSkill.user.id },
        relations: ['designation'],
      });
      if (!user) throw new NotFoundException('User not found');

      const skill = await this.skillRepo.findOne({
        where: { id: userSkill.skill.id },
      });
      if (!skill) throw new NotFoundException('Skill not found');

      await this.assertSkillAllowedForUser(user, skill);

      userSkill.requiredLevel = dto.requiredLevel;
    }

    return this.uslRepo.save(userSkill);
  }
}

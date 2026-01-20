import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSkillLevel } from './user-skill-level.entity';
import { User } from '../users/users.entity';
import { Skill } from '../skills/skill.entity';
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

  // NOTE:
  // Skills are now independent of designation. We do NOT restrict which skills
  // can be assigned as "required" for a user or which skills a user can update.

  /**
   * 🔒 HOD scope: actor can only manage users within their own department.
   */
  async assertHodScopeForUser(actor: any, targetUserId: number) {
    const role = String(actor?.role ?? '').toUpperCase();
    if (role !== 'HOD') return;

    const hodDeptId = Number(actor?.departmentId);
    if (!hodDeptId) throw new ForbiddenException('Missing departmentId in token');

    const target = await this.userRepo.findOne({
      where: { id: targetUserId },
      relations: ['department'],
    });
    if (!target) throw new NotFoundException('User not found');

    const targetDeptId = Number(target.department?.id);
    if (!targetDeptId || targetDeptId !== hodDeptId) {
      throw new ForbiddenException('HOD can manage only users in own department');
    }
  }

  // CREATE / UPSERT USER SKILL LEVEL
  async create(dto: CreateUserSkillLevelDto) {
    // currentLevel is optional for HR flows; default to 0 when missing.
    const currentLevel = dto.currentLevel ?? 0;
    this.assertLevelRange(currentLevel);
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
        currentLevel,
        requiredLevel: dto.requiredLevel ?? null,
      });
    } else {
      userSkill.currentLevel = currentLevel;
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

    // Normalize payload
    const desired = new Map<number, number>();
    for (const row of levels ?? []) {
      const sid = Number(row?.skillId);
      if (!Number.isInteger(sid)) continue;
      const rl = row?.requiredLevel ?? 4;
      this.assertRequiredLevelRange(rl);
      desired.set(sid, rl);
    }

    const existing = await this.uslRepo.find({
      where: { user: { id: user.id } },
      order: { updatedAt: 'DESC' },
    });

    const results: UserSkillLevel[] = [];

    // 1) Upsert required skills from payload
    for (const [skillId, requiredLevel] of desired.entries()) {
      const skill = await this.skillRepo.findOne({ where: { id: skillId } });
      if (!skill) throw new NotFoundException(`Skill not found: ${skillId}`);

      let userSkill = existing.find((e) => (e.skill as any)?.id === skillId);
      if (!userSkill) {
        userSkill = this.uslRepo.create({
          user,
          skill,
          currentLevel: 0,
          requiredLevel,
        });
      } else {
        userSkill.requiredLevel = requiredLevel;
      }
      results.push(await this.uslRepo.save(userSkill));
    }

    // 2) Clear requiredLevel for skills not present anymore ("remove required skill")
    for (const row of existing) {
      const sid = (row.skill as any)?.id;
      if (!Number.isInteger(sid)) continue;
      if (!desired.has(sid) && row.requiredLevel !== null) {
        row.requiredLevel = null;
        results.push(await this.uslRepo.save(row));
      }
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
      userSkill.currentLevel = dto.currentLevel;
    }

    if (dto.requiredLevel !== undefined) {
      this.assertRequiredLevelRange(dto.requiredLevel);

      userSkill.requiredLevel = dto.requiredLevel;
    }

    return this.uslRepo.save(userSkill);
  }
}

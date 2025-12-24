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
      });
    } else {
      userSkill.currentLevel = dto.currentLevel;
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

    return this.uslRepo.save(userSkill);
  }
}

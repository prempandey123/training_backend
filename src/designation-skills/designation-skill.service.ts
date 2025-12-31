import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignationSkill } from './designation-skill.entity';
import { Designation } from '../designations/designation.entity';
import { Skill } from '../skills/skill.entity';
import { CreateDesignationSkillDto } from './dto/create-designation-skill.dto';

@Injectable()
export class DesignationSkillService {
  constructor(
    @InjectRepository(DesignationSkill)
    private readonly dsRepo: Repository<DesignationSkill>,

    @InjectRepository(Designation)
    private readonly designationRepo: Repository<Designation>,

    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
  ) {}

  // CREATE
  async create(dto: CreateDesignationSkillDto) {
    const designation = await this.designationRepo.findOne({
      where: { id: dto.designationId },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    const skill = await this.skillRepo.findOne({
      where: { id: dto.skillId },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const exists = await this.dsRepo.findOne({
      where: {
        designation: { id: dto.designationId },
        skill: { id: dto.skillId },
      },
    });

    if (exists) {
      throw new ConflictException(
        'Skill already mapped to this designation',
      );
    }

    const ds = this.dsRepo.create({
      designation,
      skill,
    });

    return this.dsRepo.save(ds);
  }

  // GET SKILLS FOR A DESIGNATION
  async findByDesignation(designationId: number) {
    return this.dsRepo.find({
      where: {
        designation: { id: designationId },
      },
      relations: ['skill'],
      order: { id: 'DESC' },
    });
  }

  // REMOVE SKILL FROM DESIGNATION
  async remove(id: number) {
    const ds = await this.dsRepo.findOne({
      where: { id },
    });

    if (!ds) {
      throw new NotFoundException(
        'Designation skill mapping not found',
      );
    }

    return this.dsRepo.remove(ds);
  }
}

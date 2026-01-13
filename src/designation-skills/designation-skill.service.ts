import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
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

  private assertHodScope(user: any, designation: Designation) {
    const role = String(user?.role ?? '').toUpperCase();
    if (role !== 'HOD') return; // Admin can do anything

    const hodDeptId = Number(user?.departmentId);
    const designationDeptIds = (designation?.departments ?? []).map((d: any) => Number(d?.id));
    if (!hodDeptId || !designationDeptIds.includes(hodDeptId)) {
      throw new ForbiddenException('HOD can manage only own department designations');
    }
  }

  // CREATE
  async create(user: any, dto: CreateDesignationSkillDto) {
    const designation = await this.designationRepo.findOne({
      where: { id: dto.designationId },
      relations: ['departments'],
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    this.assertHodScope(user, designation);

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
  async findByDesignation(user: any, designationId: number) {
    const designation = await this.designationRepo.findOne({
      where: { id: designationId },
      relations: ['departments'],
    });
    if (!designation) throw new NotFoundException('Designation not found');

    this.assertHodScope(user, designation);

    return this.dsRepo.find({
      where: { designation: { id: designationId } },
      relations: ['skill'],
      order: { id: 'DESC' },
    });
  }

  // REMOVE SKILL FROM DESIGNATION
  async remove(user: any, id: number) {
    const ds = await this.dsRepo.findOne({
      where: { id },
      relations: ['designation', 'designation.departments'],
    });

    if (!ds) {
      throw new NotFoundException(
        'Designation skill mapping not found',
      );
    }

    this.assertHodScope(user, ds.designation);

    return this.dsRepo.remove(ds);
  }
}

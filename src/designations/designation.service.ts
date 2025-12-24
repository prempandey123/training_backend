import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Designation } from './designation.entity';
import { Department } from '../departments/department.entity';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';

@Injectable()
export class DesignationService {
  constructor(
    @InjectRepository(Designation)
    private readonly designationRepo: Repository<Designation>,

    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  // CREATE
  async create(dto: CreateDesignationDto) {
    const exists = await this.designationRepo.findOne({
      where: { designationName: dto.designationName },
    });

    if (exists) {
      throw new ConflictException('Designation already exists');
    }

    const departments = await this.departmentRepo.findByIds(
      dto.departmentIds,
    );

    const designation = this.designationRepo.create({
      designationName: dto.designationName,
      departments,
    });

    return this.designationRepo.save(designation);
  }

  // LIST
  async findAll() {
  return this.designationRepo.find({
    where: { isActive: true },
    relations: ['departments', 'designationSkills', 'designationSkills.skill'],
    order: { designationName: 'ASC' },
  });
}

  // GET BY ID
  async findOne(id: number) {
  const designation = await this.designationRepo.findOne({
    where: { id },
    relations: ['departments', 'designationSkills', 'designationSkills.skill'],
  });

  if (!designation) {
    throw new NotFoundException('Designation not found');
  }

  return designation;
}

  // UPDATE
  async update(id: number, dto: UpdateDesignationDto) {
    const designation = await this.findOne(id);

    if (dto.departmentIds) {
      designation.departments =
        await this.departmentRepo.findByIds(dto.departmentIds);
    }

    if (dto.designationName) {
      designation.designationName = dto.designationName;
    }

    return this.designationRepo.save(designation);
  }

  // SOFT DELETE
  async remove(id: number) {
    const designation = await this.findOne(id);
    designation.isActive = false;

    await this.designationRepo.save(designation);
    return this.designationRepo.softDelete(id);
  }
}

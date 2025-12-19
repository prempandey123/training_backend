import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Designation } from './designation.entity';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';

@Injectable()
export class DesignationService {
  constructor(
    @InjectRepository(Designation)
    private designationRepo: Repository<Designation>,
  ) {}

  async create(dto: CreateDesignationDto) {
    return this.designationRepo.save(dto);
  }

  // soft-deleted records automatically excluded
  async findAll() {
    return this.designationRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const designation = await this.designationRepo.findOne({
      where: { id },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    return designation;
  }

  // ✅ FIXED UPDATE (THIS WAS THE ISSUE)
  async update(id: number, dto: UpdateDesignationDto) {
  const designation = await this.findOne(id);

  if (dto.designationName !== undefined) {
    designation.designationName = dto.designationName;
  }

  if (dto.skills !== undefined) {
    designation.skills = dto.skills;
  }

  return this.designationRepo.save(designation);
}


  async toggleStatus(id: number) {
    const designation = await this.findOne(id);
    designation.isActive = !designation.isActive;
    return this.designationRepo.save(designation);
  }

  async softDelete(id: number) {
    await this.findOne(id);
    return this.designationRepo.softDelete(id);
  }
}

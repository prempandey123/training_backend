import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Designation } from './designation.entity';
import { CreateDesignationDto } from './dto/create-designation.dto';

@Injectable()
export class DesignationService {
  constructor(
    @InjectRepository(Designation)
    private designationRepo: Repository<Designation>,
  ) {}

  async create(dto: CreateDesignationDto) {
    const exists = await this.designationRepo.findOne({
      where: { designationName: dto.designationName },
    });

    if (exists) {
      throw new ConflictException('Designation already exists');
    }

    const designation = this.designationRepo.create(dto);
    return this.designationRepo.save(designation);
  }

  async findAll() {
    return this.designationRepo.find({
      order: { createdAt: 'DESC' },
    });
  }
}

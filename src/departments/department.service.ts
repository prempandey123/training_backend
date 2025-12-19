import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  // CREATE
  async create(dto: CreateDepartmentDto) {
    const exists = await this.departmentRepo.findOne({
      where: { name: dto.name },
    });

    if (exists) {
      throw new ConflictException('Department already exists');
    }

    const department = this.departmentRepo.create({
      name: dto.name,
    });

    return this.departmentRepo.save(department);
  }

  // LIST (only active, non-deleted)
  async findAll() {
    return this.departmentRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  // SOFT DELETE
  async remove(id: number) {
    const dept = await this.departmentRepo.findOne({
      where: { id },
    });

    if (!dept) {
      throw new NotFoundException('Department not found');
    }

    dept.isActive = false;
    await this.departmentRepo.save(dept);

    return this.departmentRepo.softDelete(id);
  }
}

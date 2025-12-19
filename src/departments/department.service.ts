import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Department } from './department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private departmentRepo: Repository<Department>,
  ) {}

  async create(dto: CreateDepartmentDto) {
    const exists = await this.departmentRepo.findOne({
      where: { name: dto.name },
    });

    if (exists) {
      throw new ConflictException('Department already exists');
    }

    return this.departmentRepo.save(dto);
  }

  /**
   * 🔹 findAll()
   * - Without search → same as before
   * - With search → filtered list (smart search)
   * - Only active & non-deleted departments
   */
  async findAll(search?: string) {
    if (search) {
      return this.departmentRepo.find({
        where: {
          name: ILike(`%${search}%`),
          isActive: true,
        },
        order: { name: 'ASC' },
      });
    }

    // 🔒 Existing behaviour preserved
    return this.departmentRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async softDelete(id: number) {
    const dept = await this.departmentRepo.findOne({
      where: { id },
    });

    if (!dept) {
      throw new NotFoundException('Department not found');
    }

    return this.departmentRepo.softDelete(id);
  }
}

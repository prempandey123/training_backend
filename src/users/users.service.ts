import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './users.entity';
import { Department } from '../departments/department.entity';
import { Designation } from '../designations/designation.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,

    @InjectRepository(Designation)
    private readonly designationRepo: Repository<Designation>,
  ) {}

  // ✅ REQUIRED FOR AUTH
  async findByEmail(email: string) {
    // password column is select:false, so we explicitly select it for auth
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.department', 'department')
      .leftJoinAndSelect('user.designation', 'designation')
      .where('user.email = :email', { email })
      .getOne();
  }

  // CREATE USER
  async create(dto: CreateUserDto) {
    const department = await this.departmentRepo.findOne({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const designation = await this.designationRepo.findOne({
      where: { id: dto.designationId },
    });
    if (!designation) {
      throw new NotFoundException('Designation not found');
    }


    // dto.password is required on create (DTO validates it)
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      employeeId: dto.employeeId,
      mobile: dto.mobile,
      password: hashedPassword,
      role: dto.role,
      department,
      designation,
      dateOfJoining: new Date(dto.dateOfJoining),
      isActive: dto.isActive ?? true,
      biometricLinked: dto.biometricLinked ?? false,
    });

    return this.userRepo.save(user);
  }

  // LIST USERS
  findAll() {
    return this.userRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  // GET ONE
  findOne(id: number) {
    return this.userRepo.findOne({
      where: { id },
    });
  }

  // UPDATE USER (FIXED NULL SAFETY)
  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.departmentId) {
      const department = await this.departmentRepo.findOne({
        where: { id: dto.departmentId },
      });
      if (!department) {
        throw new NotFoundException('Department not found');
      }
      user.department = department;
    }

    if (dto.designationId) {
      const designation = await this.designationRepo.findOne({
        where: { id: dto.designationId },
      });
      if (!designation) {
        throw new NotFoundException('Designation not found');
      }
      user.designation = designation;
    }

    if (dto.dateOfJoining) {
      user.dateOfJoining = new Date(dto.dateOfJoining);
    }

    if (dto.role) user.role = dto.role;
    if (dto.name) user.name = dto.name;
    if (dto.mobile) user.mobile = dto.mobile;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    // 🔐 if password is provided in edit, hash it and update
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    return this.userRepo.save(user);
  }

  // DELETE USER
  remove(id: number) {
    return this.userRepo.delete(id);
  }

  // ✅ REQUIRED FOR DASHBOARD
  async getUserStats() {
    const total = await this.userRepo.count();
    const active = await this.userRepo.count({
      where: { isActive: true },
    });
    const inactive = await this.userRepo.count({
      where: { isActive: false },
    });

    return { total, active, inactive };
  }
}

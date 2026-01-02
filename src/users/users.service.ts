import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './users.entity';
import { Department } from '../departments/department.entity';
import { Designation } from '../designations/designation.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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

  // ✅ SMART SEARCH FOR USERS (name / employeeId / email)
  async searchUsers(q: string) {
    const query = (q || '').trim();
    if (!query) return [];

    return this.userRepo.find({
      where: [
        { name: ILike(`%${query}%`) },
        { employeeId: ILike(`%${query}%`) },
        { email: ILike(`%${query}%`) },
      ],
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  // ✅ helper: fetch user with password
  private async findOneWithPassword(id: number) {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  // CREATE USER
  async create(dto: CreateUserDto) {
    const email = (dto.email || '').trim().toLowerCase();
    const employeeId = (dto.employeeId || '').trim();

    // ✅ HR might accidentally try to add same email/employeeId again.
    // Instead of crashing with DB error, return a clean 409.
    const existing = await this.userRepo.findOne({
      where: [{ email }, { employeeId }],
    });
    if (existing) {
      if (existing.email === email) {
        throw new ConflictException(`Email already exists: ${email}`);
      }
      if (existing.employeeId === employeeId) {
        throw new ConflictException(
          `Employee ID already exists: ${employeeId}`,
        );
      }
      throw new ConflictException('User already exists');
    }

    const department = await this.departmentRepo.findOne({
      where: { id: dto.departmentId },
    });
    if (!department) throw new NotFoundException('Department not found');

    const designation = await this.designationRepo.findOne({
      where: { id: dto.designationId },
    });
    if (!designation) throw new NotFoundException('Designation not found');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      name: dto.name,
      email,
      employeeId,
      mobile: dto.mobile,
      password: hashedPassword,
      role: dto.role,
      employeeType: dto.employeeType,
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

  // UPDATE USER
  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');

    // ✅ If email/employeeId is being changed, block duplicates with a clean 409
    if (dto.email && dto.email.trim().toLowerCase() !== user.email) {
      const email = dto.email.trim().toLowerCase();
      const exists = await this.userRepo
        .createQueryBuilder('u')
        .where('u.email = :email', { email })
        .andWhere('u.id != :id', { id })
        .getOne();
      if (exists) throw new ConflictException(`Email already exists: ${email}`);
      user.email = email;
    }

    if (dto.employeeId && dto.employeeId.trim() !== user.employeeId) {
      const employeeId = dto.employeeId.trim();
      const exists = await this.userRepo
        .createQueryBuilder('u')
        .where('u.employeeId = :employeeId', { employeeId })
        .andWhere('u.id != :id', { id })
        .getOne();
      if (exists)
        throw new ConflictException(
          `Employee ID already exists: ${employeeId}`,
        );
      user.employeeId = employeeId;
    }

    if (dto.departmentId) {
      const department = await this.departmentRepo.findOne({
        where: { id: dto.departmentId },
      });
      if (!department) throw new NotFoundException('Department not found');
      user.department = department;
    }

    if (dto.designationId) {
      const designation = await this.designationRepo.findOne({
        where: { id: dto.designationId },
      });
      if (!designation) throw new NotFoundException('Designation not found');
      user.designation = designation;
    }

    if (dto.dateOfJoining) user.dateOfJoining = new Date(dto.dateOfJoining);

    if (dto.role) user.role = dto.role;
    if (dto.name) user.name = dto.name;
    if (dto.mobile) user.mobile = dto.mobile;

    // Worker / Staff
    if (dto.employeeType) user.employeeType = dto.employeeType;

    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.biometricLinked !== undefined)
      user.biometricLinked = dto.biometricLinked;

    // 🔐 if password is provided in edit, hash it and update
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    return this.userRepo.save(user);
  }

  // ✅ UPDATE PASSWORD (Dedicated)
  async updatePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.findOneWithPassword(id);
    if (!user) throw new NotFoundException('User not found');

    // ✅ TS + runtime safety: password must exist here
    if (!user.password) {
      throw new BadRequestException(
        'Password is not available for this user (select:false / data issue)',
      );
    }

    // If oldPassword provided -> verify
    if (dto.oldPassword && dto.oldPassword.trim().length > 0) {
      const ok = await bcrypt.compare(dto.oldPassword, user.password);
      if (!ok) throw new BadRequestException('Old password is incorrect');
    }

    if (!dto.newPassword || dto.newPassword.trim().length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);

    return { message: 'Password updated successfully' };
  }

  // DELETE USER
  remove(id: number) {
    return this.userRepo.delete(id);
  }

  // ✅ REQUIRED FOR DASHBOARD
  async getUserStats() {
    const total = await this.userRepo.count();
    const active = await this.userRepo.count({ where: { isActive: true } });
    const inactive = await this.userRepo.count({ where: { isActive: false } });

    return { total, active, inactive };
  }
}

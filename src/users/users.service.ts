import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  create(dto: CreateUserDto) {
    const user = this.userRepo.create(dto);
    return this.userRepo.save(user);
  }

  findAll() {
    return this.userRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: number) {
    return this.userRepo.findOneBy({ id });
  }

  // ✅ REQUIRED FOR AUTH
  findByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
    });
  }

  update(id: number, dto: UpdateUserDto) {
    return this.userRepo.update(id, dto);
  }

  remove(id: number) {
    return this.userRepo.delete(id);
  }
  async getUserStats() {
  const total = await this.userRepo.count();
  const active = await this.userRepo.count({
    where: { isActive: true },
  });
  const inactive = await this.userRepo.count({
    where: { isActive: false },
  });

  return {
    total,
    active,
    inactive,
  };
}

}


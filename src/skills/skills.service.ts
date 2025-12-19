import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from './skill.entity';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class SkillService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
  ) {}

  // CREATE
  async create(dto: CreateSkillDto) {
    const exists = await this.skillRepo.findOne({
      where: { name: dto.name },
    });

    if (exists) {
      throw new ConflictException('Skill already exists');
    }

    const skill = this.skillRepo.create({
      name: dto.name,
    });

    return this.skillRepo.save(skill);
  }

  // LIST (only active)
  async findAll() {
    return this.skillRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  // GET BY ID
  async findOne(id: number) {
    const skill = await this.skillRepo.findOne({
      where: { id },
    });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return skill;
  }

  // UPDATE
  async update(id: number, dto: UpdateSkillDto) {
    const skill = await this.findOne(id);

    if (dto.name) {
      skill.name = dto.name;
    }

    return this.skillRepo.save(skill);
  }

  // SOFT DELETE
  async remove(id: number) {
    const skill = await this.findOne(id);
    skill.isActive = false;

    await this.skillRepo.save(skill);
    return this.skillRepo.softDelete(id);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from './skill.entity';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
  ) {}

  create(data: Partial<Skill>) {
    const skill = this.skillRepo.create(data);
    return this.skillRepo.save(skill);
  }

  findAll() {
    return this.skillRepo.find();
  }

  // ✅ THIS WAS MISSING
  async findOne(id: number) {
    const skill = await this.skillRepo.findOne({ where: { id } });

    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    return skill;
  }

  async update(id: number, data: Partial<Skill>) {
    const skill = await this.findOne(id);
    Object.assign(skill, data);
    return this.skillRepo.save(skill);
  }

  async remove(id: number) {
    const skill = await this.findOne(id);
    return this.skillRepo.remove(skill);
  }
}

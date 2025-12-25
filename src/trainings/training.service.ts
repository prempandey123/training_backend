import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { Training, TrainingAttendee } from './training.entity';

@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(Training)
    private readonly trainingRepo: Repository<Training>,
  ) {}

  async create(dto: CreateTrainingDto) {
    // NOTE: Using `create()` without args avoids TypeORM overload/type confusion
    // that can sometimes infer the array overload and break compilation.
    const training = this.trainingRepo.create();

    training.topic = dto.topic;
    training.date = dto.trainingDate;
    training.time = dto.trainingTime;
    training.departments = dto.departments ?? [];
    training.skills = dto.skills ?? [];
    training.assignedEmployees = (dto.assignedEmployees ?? []).map((e) => ({
      empId: e.empId,
      name: e.name,
      dept: e.dept,
    }));

    const attendees: TrainingAttendee[] = (dto.assignedEmployees ?? []).map((e) => ({
      empId: e.empId,
      name: e.name,
      dept: e.dept,
      status: 'ABSENT',
    }));
    training.attendees = attendees;

    training.status = dto.status ?? 'PENDING';
    training.trainer = dto.trainer ?? undefined;

    const saved = await this.trainingRepo.save(training);
    return this.toUi(saved);
  }

  async findAll() {
    const list = await this.trainingRepo.find({ order: { id: 'DESC' } });
    return list.map((t) => this.toUi(t));
  }

  async findOne(id: number) {
    const t = await this.trainingRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Training not found');
    return this.toUi(t);
  }

  async update(id: number, dto: UpdateTrainingDto) {
    const t = await this.trainingRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Training not found');

    if (dto.topic !== undefined) t.topic = dto.topic;
    if (dto.trainingDate !== undefined) t.date = dto.trainingDate;
    if (dto.trainingTime !== undefined) t.time = dto.trainingTime;
    if (dto.departments !== undefined) t.departments = dto.departments;
    if (dto.skills !== undefined) t.skills = dto.skills;
    if (dto.trainer !== undefined) t.trainer = dto.trainer;
    if (dto.status !== undefined) t.status = dto.status;
    if (dto.attendees !== undefined) t.attendees = dto.attendees;
    if (dto.postponeReason !== undefined) t.postponeReason = dto.postponeReason;

    const saved = await this.trainingRepo.save(t);
    return this.toUi(saved);
  }

  async remove(id: number) {
    const t = await this.trainingRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Training not found');
    await this.trainingRepo.remove(t);
    return { message: 'Training deleted' };
  }

  // Map DB entity to frontend's expected shape
  private toUi(t: Training) {
    const dept =
      Array.isArray(t.departments) && t.departments.length ? t.departments[0] : '';

    return {
      id: t.id,
      topic: t.topic,
      date: t.date,
      time: t.time,
      department: dept, // UI shows single department column
      departments: t.departments ?? [],
      trainer: t.trainer ?? '',
      status: t.status,
      skills: t.skills ?? [],
      assignedEmployees: t.assignedEmployees ?? [],
      attendees: t.attendees ?? [],
      postponeReason: t.postponeReason ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}

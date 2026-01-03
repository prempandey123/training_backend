import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { User } from '../users/users.entity';
import { Department } from '../departments/department.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
  ) {}

  async list(params: {
    limit?: number;
    page?: number;
    userId?: number;
    departmentId?: number;
  }) {
    const limit = Math.min(Math.max(Number(params.limit || 20), 1), 100);
    const page = Math.max(Number(params.page || 1), 1);
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .leftJoinAndSelect('log.department', 'department')
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (params.userId) {
      qb.andWhere('actor.id = :uid', { uid: params.userId });
    }
    if (params.departmentId) {
      qb.andWhere('department.id = :did', { did: params.departmentId });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
    };
  }

  async create(partial: Partial<AuditLog>) {
    const log = this.repo.create(partial);
    return this.repo.save(log);
  }

  /**
   * Generates 20 sample logs for the dashboard. Uses existing users/departments.
   */
  async generateSample(count = 20) {
    const users = await this.userRepo.find({
      where: { isActive: true },
      take: 50,
      order: { id: 'ASC' },
    });

    const depts = await this.deptRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    // If no departments exist but users exist, we can still log without department.
    const actions = [
      { action: 'LOGIN', entity: 'auth', desc: 'User logged in' },
      { action: 'CREATE_USER', entity: 'users', desc: 'Created a user record' },
      { action: 'UPDATE_USER', entity: 'users', desc: 'Updated user details' },
      { action: 'CREATE_DEPARTMENT', entity: 'departments', desc: 'Created a department' },
      { action: 'CREATE_TRAINING', entity: 'trainings', desc: 'Created a training' },
      { action: 'UPDATE_TRAINING', entity: 'trainings', desc: 'Updated training schedule' },
      { action: 'ASSIGN_SKILL', entity: 'user-skill-levels', desc: 'Updated skill level mapping' },
      { action: 'GENERATE_REPORT', entity: 'reports', desc: 'Generated report from dashboard' },
      { action: 'UPLOAD_ATTENDANCE', entity: 'attendance', desc: 'Uploaded attendance for training' },
      { action: 'UPDATE_PASSWORD', entity: 'users', desc: 'Changed password' },
    ];

    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    const logs: AuditLog[] = [];
    for (let i = 0; i < count; i++) {
      const u = users.length ? pick(users) : undefined;
      const a = pick(actions);
      const dept = u?.department || (depts.length ? pick(depts) : undefined);

      const createdAt = new Date(Date.now() - (count - i) * 60 * 60 * 1000); // spaced 1h apart

      logs.push(
        this.repo.create({
          actor: u,
          department: dept,
          action: a.action,
          entity: a.entity,
          entityId: String(1000 + i),
          description: a.desc,
          method: 'POST',
          path: `/seed/${a.entity}`,
          statusCode: 200,
          ip: '127.0.0.1',
          userAgent: 'seed-script',
          meta: {
            sample: true,
            note: 'Generated for dashboard testing',
          },
          createdAt,
        }),
      );
    }

    await this.repo.save(logs);
    return { inserted: logs.length };
  }
}

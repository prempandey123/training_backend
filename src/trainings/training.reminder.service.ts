import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Training } from './training.entity';
import { User } from '../users/users.entity';
import { BrevoEmailService } from '../notifications/services/brevo-email.service';

@Injectable()
export class TrainingReminderService {
  private readonly logger = new Logger(TrainingReminderService.name);

  constructor(
    @InjectRepository(Training)
    private readonly trainingRepo: Repository<Training>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mail: BrevoEmailService,
  ) {}

  /**
   * Runs every 5 minutes.
   * Sends:
   *  - 1 day reminder (when training starts within next 24 hours)
   *  - 1 hour reminder (when training starts within next 1 hour)
   */
  @Cron('*/5 * * * *')
  async handleReminders() {
    const now = new Date();
    const today = this.getLocalISODate(now);

    // Load upcoming trainings (today onwards)
    const trainings = await this.trainingRepo
      .createQueryBuilder('t')
      .where('t.date >= :today', { today })
      .orderBy('t.id', 'DESC')
      .getMany();

    for (const t of trainings) {
      const start = this.parseStartDateTime(t.date, t.time);
      if (!start) continue;

      const diffMs = start.getTime() - now.getTime();
      if (diffMs <= 0) continue; // already started/past

      const diffHours = diffMs / (1000 * 60 * 60);

      // 1 day before (within 24h)
      if (!t.mailSent1DayBefore && diffHours <= 24 && diffHours > 1.25) {
        await this.sendToAssigned(t, 'Training Reminder – Tomorrow', this.mail.reminderHtml(
          'Training Reminder',
          t,
          'Your training is scheduled within the next 24 hours.',
        ));
        t.mailSent1DayBefore = true;
        await this.trainingRepo.save(t);
      }

      // 1 hour before (within 1h)
      if (!t.mailSent1HourBefore && diffHours <= 1) {
        await this.sendToAssigned(t, 'Training Reminder – Starts in 1 Hour', this.mail.reminderHtml(
          'Training Starting Soon',
          t,
          'Your training starts in about 1 hour.',
        ));
        t.mailSent1HourBefore = true;
        await this.trainingRepo.save(t);
      }
    }
  }

  private async sendToAssigned(t: Training, subject: string, html: string) {
    const empIds = (t.assignedEmployees ?? []).map((e) => e.empId).filter(Boolean);
    if (empIds.length === 0) return;

    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.employeeId IN (:...ids)', { ids: empIds })
      .getMany();

    if (users.length === 0) return;

    await this.mail.sendMail(
      users.map((u) => ({ email: u.email, name: u.name })),
      subject,
      html,
    );

    this.logger.log(`Reminder sent for training ${t.id} to ${users.length} recipients.`);
  }

  /**
   * Parses "10:00 - 12:00" -> start time "10:00".
   */
  private parseStartDateTime(dateISO: string, timeRange: string): Date | null {
    if (!dateISO || !timeRange) return null;
    const startPart = timeRange.split('-')[0]?.trim();
    // Accept "10:00" or "10:00 AM"
    const m = startPart.match(/(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/);
    if (!m) return null;
    let hh = Number(m[1]);
    const mm = Number(m[2]);
    const ampm = (m[3] || '').toUpperCase();
    if (ampm === 'PM' && hh < 12) hh += 12;
    if (ampm === 'AM' && hh === 12) hh = 0;

    const hhStr = String(hh).padStart(2, '0');
    const mmStr = String(mm).padStart(2, '0');
    return new Date(`${dateISO}T${hhStr}:${mmStr}:00`);
  }

  private getLocalISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

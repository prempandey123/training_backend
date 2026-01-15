import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { Training, TrainingAttendee } from './training.entity';
import { TrainingType } from './enums/training-type.enum';
import * as ExcelJS from 'exceljs';
import { User } from '../users/users.entity';
import { BrevoEmailService } from '../notifications/services/brevo-email.service';

type CalendarEvent = {
  id: number;
  title: string;
  start: string;
  end?: string;
  extendedProps: {
    department: string;
    trainer: string;
    status: string;
    time: string;
    skills: string[];
  };
};

@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(Training)
    private readonly trainingRepo: Repository<Training>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mail: BrevoEmailService,
  ) {}

  async create(dto: CreateTrainingDto) {
    // NOTE: Using `create()` without args avoids TypeORM overload/type confusion
    // that can sometimes infer the array overload and break compilation.
    const training = this.trainingRepo.create();

    training.topic = dto.topic;
    training.trainingType = dto.trainingType ?? TrainingType.INTERNAL;
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

    // ✅ Notify participants on creation (once)
    // Do not fail the API call if mail fails, but DO log the real reason.
    await this.sendCreatedMails(saved).catch((e) => {
      // eslint-disable-next-line no-console
      console.error('sendCreatedMails failed:', e);
    });
    return this.toUi(saved);
  }

  private async sendCreatedMails(training: Training) {
    if (training.mailSentOnCreate) return;
    const empIds = (training.assignedEmployees ?? []).map((e) => e.empId).filter(Boolean);
    if (empIds.length === 0) return;

    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.employeeId IN (:...ids)', { ids: empIds })
      .getMany();
    if (users.length === 0) return;

    // Only send to users that actually have an email.
    const recipients = users
      .filter((u) => !!u.email)
      .map((u) => ({ email: u.email, name: u.name }));
    if (recipients.length === 0) return;

    await this.mail.sendMail(
      recipients,
      'Training Assigned',
      this.mail.trainingCreatedHtml(training),
    );

    training.mailSentOnCreate = true;
    await this.trainingRepo.save(training);
  }

  
  /**
   * Sends the "Training Assigned" email to participants using the form payload,
   * without creating/saving a Training record. Used by the UI "Send mail to participants" button.
   */
  async sendMailPreview(dto: CreateTrainingDto) {
    const empIds = (dto.assignedEmployees ?? []).map((e) => e.empId).filter(Boolean);
    if (empIds.length === 0) {
      throw new BadRequestException('No participants selected');
    }

    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.employeeId IN (:...ids)', { ids: empIds })
      .getMany();

    // Only send to users that actually have an email.
    const recipients = users
      .filter((u) => !!u.email)
      .map((u) => ({ email: u.email as string, name: u.name }));

    if (recipients.length === 0) {
      throw new BadRequestException('No participant emails found');
    }

    await this.mail.sendMail(
      recipients,
      'Training Assigned',
      this.mail.trainingCreatedHtml({
        topic: dto.topic,
        date: dto.trainingDate,
        time: dto.trainingTime,
        trainer: dto.trainer ?? null,
      }),
    );

    return { sent: true, recipients: recipients.length };
  }

async findAll() {
    const list = await this.trainingRepo.find({ order: { id: 'DESC' } });
    return list.map((t) => this.toUi(t));
  }

  /**
   * Returns a calendar-consumable list so the frontend calendar doesn't need
   * to guess how to convert date + "10:00 - 12:00" into start/end.
   */
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    const list = await this.trainingRepo.find({ order: { id: 'DESC' } });
    return list.map((t) => this.toCalendarEvent(t));
  }

  async findOne(id: number) {
    const t = await this.trainingRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Training not found');
    return this.toUi(t);
  }

  async update(id: number, dto: UpdateTrainingDto) {
    const t = await this.trainingRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Training not found');

    // Attendance can be marked only for trainings happening today or in the past.
    if (dto.attendees !== undefined) {
      const today = this.getLocalISODate();
      // Dates are stored as YYYY-MM-DD so lexicographic compare is safe.
      if ((t.date || '').trim() && t.date > today) {
        throw new BadRequestException(
          'Attendance for upcoming trainings is locked. You can mark attendance only on the training day or for past trainings.',
        );
      }
    }

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

  /**
   * Placeholder biometric snapshot endpoint.
   * Later, integrate actual device sync and return the device punches.
   */
  async getBiometricSnapshot(id: number) {
    // Ensure training exists
    await this.findOne(id);
    return {
      trainingId: id,
      syncedAt: new Date().toISOString(),
      records: [],
      message: 'Biometric sync is not configured yet. Backend logic will be added later.',
    };
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

    const cal = this.toCalendarEvent(t);

    return {
      id: t.id,
      topic: t.topic,
      // Backward compatibility for components that still read `title`
      title: t.topic,
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
      // Calendar-friendly projection (non-breaking additive fields)
      start: cal.start,
      end: cal.end,
      calendarEvent: cal,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  private toCalendarEvent(t: Training): CalendarEvent {
    const dept =
      Array.isArray(t.departments) && t.departments.length ? t.departments[0] : '';

    const { start, end } = this.combineDateAndTimeRange(t.date, t.time);

    return {
      id: t.id,
      title: t.topic,
      start,
      ...(end ? { end } : {}),
      extendedProps: {
        department: dept,
        trainer: t.trainer ?? '',
        status: t.status,
        time: t.time,
        skills: t.skills ?? [],
      },
    };
  }

  /**
   * Combines a YYYY-MM-DD date with a "HH:mm - HH:mm" string into ISO datetimes.
   * If parsing fails, returns date-only start so month view still works.
   */
  private combineDateAndTimeRange(date: string, timeRange: string): { start: string; end?: string } {
    const safeDate = (date || '').trim();
    const safeTime = (timeRange || '').trim();

    if (!safeDate) return { start: '' };

    const parts = safeTime.split('-').map((p) => p.trim()).filter(Boolean);
    const startTime = parts[0];
    const endTime = parts[1];

    const startIso = this.toIsoLocalDateTime(safeDate, startTime);
    const endIso = endTime ? this.toIsoLocalDateTime(safeDate, endTime) : undefined;

    // If we couldn't parse time, fall back to date-only so calendar month still renders.
    if (!startIso) return { start: safeDate };

    return { start: startIso, ...(endIso ? { end: endIso } : {}) };
  }

  /**
   * Produces an ISO-like local datetime string (YYYY-MM-DDTHH:mm:00).
   * We intentionally avoid timezone conversion (FullCalendar can treat it as local).
   */
  private toIsoLocalDateTime(date: string, hhmm?: string): string | null {
    if (!date) return null;
    if (!hhmm) return null;

    const m = hhmm.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!m) return null;

    const h = m[1].padStart(2, '0');
    const min = m[2].padStart(2, '0');
    return `${date}T${h}:${min}:00`;
  }

  /**
   * Returns local date as YYYY-MM-DD.
   * We avoid relying on UTC date because attendance lock should follow server local time.
   */
  private getLocalISODate(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

/**
 * Export trainings list to Excel for audit purpose.
 */
async generateTrainingListExcel(): Promise<ExcelJS.Workbook> {
  const trainings = await this.trainingRepo.find({
    order: { id: 'DESC' },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Training Competency System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Trainings');

  sheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Topic', key: 'topic', width: 32 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Time', key: 'time', width: 16 },
    { header: 'Departments', key: 'departments', width: 28 },
    { header: 'Skills', key: 'skills', width: 28 },
    { header: 'Trainer', key: 'trainer', width: 22 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Participants', key: 'participants', width: 14 },
    { header: 'Attended', key: 'attended', width: 12 },
    { header: 'Absent', key: 'absent', width: 12 },
    { header: 'Postpone Reason', key: 'postponeReason', width: 28 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Updated At', key: 'updatedAt', width: 20 },
  ];

  // Header styling
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columns.length },
  };

  const safeJoin = (v?: any) =>
    Array.isArray(v) ? v.filter(Boolean).join(', ') : '';

  trainings.forEach((t) => {
    const attendees = Array.isArray(t.attendees) ? t.attendees : [];
    const attendedCount = attendees.filter((a) => a?.status === 'ATTENDED').length;
    const absentCount = attendees.filter((a) => a?.status === 'ABSENT').length;

    sheet.addRow({
      id: t.id,
      topic: t.topic,
      date: t.date,
      time: t.time,
      departments: safeJoin(t.departments),
      skills: safeJoin(t.skills),
      trainer: t.trainer || '',
      status: t.status,
      participants: attendees.length || 0,
      attended: attendedCount,
      absent: absentCount,
      postponeReason: t.postponeReason || '',
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : '',
      updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : '',
    });
  });

  // Improve readability
  sheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'middle', wrapText: true };
    if (rowNumber > 1) {
      row.height = 18;
    }
  });

  return workbook;
}

}
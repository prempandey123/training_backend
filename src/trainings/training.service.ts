import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { Training, TrainingAttendee } from './training.entity';
import { TrainingType } from './enums/training-type.enum';
import { TrainingCategory } from './enums/training-category.enum';
import { TrainingSessionType } from './enums/training-session-type.enum';
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
  venue: string;
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
    training.venue = (dto.venue || '').trim() || null;
    // UI label: Mode -> maps to trainingType. Accept both keys.
    training.trainingType = (dto.trainingType ?? dto.mode) ?? TrainingType.INTERNAL;
    training.category = dto.category ?? TrainingCategory.BOTH;
    training.type = dto.type ?? TrainingSessionType.MANDATORY;
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

    if (dto.status === 'CANCELLED') {
      const remark = (dto.cancelRemark ?? '').trim();
      if (!remark) {
        throw new BadRequestException('Cancel remark is required');
      }
      training.status = 'CANCELLED';
      training.cancelRemark = remark;
    } else {
      training.status = dto.status ?? 'PENDING';
      training.cancelRemark = (dto.cancelRemark ?? '').trim() || null;
    }
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
        venue: (dto.venue || '').trim() || null,
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

    const prevStatus = t.status;
    const prevDate = t.date;
    const prevTime = t.time;

    // Attendance (ATTENDED/ABSENT) can be marked only for trainings happening today or in the past.
    // NOTE: The training edit screen also sends an `attendees` array to manage the participant roster
    // (employee list) even for upcoming trainings. We only lock updates that actually include
    // attendance status changes.
    // IMPORTANT:
    // The edit-training UI may send an attendees array for roster management.
    // We should only lock when the request is actually *marking attendance*, i.e.
    // setting a status to ATTENDED/ABSENT. Merely having a `status` key (undefined/null)
    // should not trigger the lock.
    const isAttendanceMarkingRequest =
      dto.attendees !== undefined &&
      Array.isArray(dto.attendees) &&
      dto.attendees.some((a: any) => {
        const s = String(a?.status ?? '').toUpperCase().trim();
        return s === 'ATTENDED' || s === 'ABSENT';
      });

    // Allow cancelling/updating status even for upcoming trainings.
    // Only attendance marking is locked for future trainings.
    if (isAttendanceMarkingRequest && dto.status !== 'CANCELLED') {
      const today = this.getLocalISODate();
      // Dates are stored as YYYY-MM-DD so lexicographic compare is safe.
      if ((t.date || '').trim() && t.date > today) {
        throw new BadRequestException(
          'Attendance for upcoming trainings is locked. You can mark attendance only on the training day or for past trainings.',
        );
      }
    }

    if (dto.topic !== undefined) t.topic = dto.topic;
    if (dto.venue !== undefined) t.venue = (dto.venue || '').trim() || null;
    if (dto.trainingDate !== undefined) t.date = dto.trainingDate;
    if (dto.trainingTime !== undefined) t.time = dto.trainingTime;
    if (dto.departments !== undefined) t.departments = dto.departments;
    if (dto.skills !== undefined) t.skills = dto.skills;
    if (dto.trainer !== undefined) t.trainer = dto.trainer;
    // Cancel requires a remark.
    if (dto.status === 'CANCELLED') {
      const remark = (dto.cancelRemark ?? '').trim();
      if (!remark) {
        throw new BadRequestException('Cancel remark is required');
      }
      t.status = 'CANCELLED';
      // Keep a history of cancellation remarks (so postponed->cancelled shows both clearly).
      t.cancelRemark = this.appendRemarkLog(t.cancelRemark, remark);
    } else if (dto.status !== undefined) {
      t.status = dto.status;
    }
    if (dto.attendees !== undefined) {
      // When marking attendance, store the timing as well (HH:mm).
      // If timing is not provided for an ATTENDED attendee, default it to scheduled training time.
      t.attendees = this.normalizeAttendeesForSave(dto.attendees as any[], t.time);
    }
    // Keep a history of postpone reasons (multiple postpones should be visible).
    if (dto.postponeReason !== undefined) {
      const reason = (dto.postponeReason ?? '').trim();
      // If empty string was sent, allow clearing.
      t.postponeReason = reason ? this.appendRemarkLog(t.postponeReason, reason) : null;
    }
    if (dto.cancelRemark !== undefined && dto.status !== 'CANCELLED') {
      // Allow updating remark even if status isn't cancelled, but don't force.
      t.cancelRemark = (dto.cancelRemark || '').trim() || null;
    }
    if (dto.trainingType !== undefined || dto.mode !== undefined)
      t.trainingType = (dto.trainingType ?? dto.mode) as TrainingType;
    if (dto.category !== undefined) t.category = dto.category;
    if (dto.type !== undefined) t.type = dto.type;

    // If the client is explicitly postponing (or re-postponing) the training,
    // allow a fresh notification by resetting the flag.
    const isPostponeAction =
      dto.status === 'POSTPONED' &&
      (
        prevStatus !== 'POSTPONED' ||
        dto.trainingDate !== undefined ||
        dto.trainingTime !== undefined ||
        dto.postponeReason !== undefined
      );
    if (isPostponeAction) {
      t.mailSentOnPostpone = false;
    }

    // If any attendee is marked ATTENDED, the training is considered COMPLETED.
    // (Unless it is explicitly cancelled/postponed.)
    const hasAnyAttended = Array.isArray(t.attendees)
      ? t.attendees.some((a: any) => String(a?.status ?? '').toUpperCase() === 'ATTENDED')
      : false;

    if (t.status !== 'CANCELLED' && t.status !== 'POSTPONED' && hasAnyAttended) {
      t.status = 'COMPLETED';
    }

    const saved = await this.trainingRepo.save(t);

    // ✅ If training is marked as postponed, notify users once with reason + updated schedule
    // Do not fail the API call if email fails.
    if (saved.status === 'POSTPONED' && !saved.mailSentOnPostpone) {
      await this.sendPostponedMails(saved, { date: prevDate, time: prevTime }).catch((e) => {
        // eslint-disable-next-line no-console
        console.error('sendPostponedMails failed:', e);
      });
    }

    return this.toUi(saved);
  }

  private normalizeAttendeesForSave(attendees: any[], trainingTime: string) {
    if (!Array.isArray(attendees)) return attendees as any;
    const range = this.parseTimeRange(trainingTime);
    const isHHMM = (s: string) => /^\d{1,2}:\d{2}$/.test(s);
    const norm = (s: string) => {
      const t = String(s || '').trim();
      if (!isHHMM(t)) return '';
      return t.padStart(5, '0');
    };
    return attendees.map((a) => {
      const status = String(a?.status ?? 'ABSENT').toUpperCase() === 'ATTENDED' ? 'ATTENDED' : 'ABSENT';
      const base: any = {
        empId: String(a?.empId ?? '').trim(),
        name: String(a?.name ?? '').trim(),
        dept: a?.dept ?? undefined,
        status,
      };

      if (status === 'ATTENDED') {
        const inTime = norm(a?.inTime);
        const outTime = norm(a?.outTime);
        base.inTime = inTime || range.start || undefined;
        base.outTime = outTime || range.end || undefined;
      }

      // If absent, don't store timing.
      return base;
    });
  }

  private parseTimeRange(time: string): { start: string | null; end: string | null } {
    // Expected formats from UI:
    // "10:00 - 12:00" or "10:00-12:00" (HH:mm)
    const raw = String(time || '').trim();
    if (!raw) return { start: null, end: null };
    const parts = raw.split('-').map((p) => p.trim());
    if (parts.length < 2) return { start: null, end: null };
    const start = parts[0];
    const end = parts[1];
    const isHHMM = (s: string) => /^\d{1,2}:\d{2}$/.test(s);
    return {
      start: isHHMM(start) ? start.padStart(5, '0') : null,
      end: isHHMM(end) ? end.padStart(5, '0') : null,
    };
  }

  /**
   * Append a remark to an existing log while keeping older remarks.
   * Stored as a newline-separated list with a timestamp prefix.
   * This avoids schema changes and keeps backward compatibility.
   */
  private appendRemarkLog(existing: string | null | undefined, next: string) {
    const cleanExisting = (existing ?? '').trim();
    const cleanNext = (next ?? '').trim();
    if (!cleanNext) return cleanExisting || null;

    const ts = this.formatLocalTimestamp(new Date());
    const line = `[${ts}] ${cleanNext}`;

    if (!cleanExisting) return line;

    // Avoid duplicating the exact same last line.
    const parts = cleanExisting.split('\n').map((s) => s.trim()).filter(Boolean);
    const last = parts.length ? parts[parts.length - 1] : '';
    if (last === line) return cleanExisting;

    return `${cleanExisting}\n${line}`;
  }

  private formatLocalTimestamp(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  private async sendPostponedMails(training: Training, previous?: { date?: string; time?: string }) {
    if (training.mailSentOnPostpone) return;

    // As requested: notify ALL active users.
    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.isActive = :active', { active: true })
      .getMany();

    const recipients = users
      .filter((u) => !!u.email)
      .map((u) => ({ email: u.email, name: u.name }));
    if (recipients.length === 0) return;

    await this.mail.sendMail(
      recipients,
      `Training Postponed: ${training.topic}`,
      this.mail.trainingPostponedHtml(training, previous),
    );

    training.mailSentOnPostpone = true;
    await this.trainingRepo.save(training);
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

    const effectiveStatus = this.computeEffectiveStatus(t);

    return {
      id: t.id,
      topic: t.topic,
      // Backward compatibility for components that still read `title`
      title: t.topic,
      venue: t.venue ?? '',
      date: t.date,
      time: t.time,
      department: dept, // UI shows single department column
      departments: t.departments ?? [],
      trainer: t.trainer ?? '',
      // Backward-compatible field. UI may show this as "Mode".
      trainingType: t.trainingType,
      mode: t.trainingType,
      category: t.category ?? TrainingCategory.BOTH,
      type: t.type ?? TrainingSessionType.MANDATORY,
      status: effectiveStatus,
      skills: t.skills ?? [],
      assignedEmployees: t.assignedEmployees ?? [],
      attendees: t.attendees ?? [],
      postponeReason: t.postponeReason ?? null,
      cancelRemark: t.cancelRemark ?? null,
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

    const effectiveStatus = this.computeEffectiveStatus(t);

    return {
      id: t.id,
      title: t.topic,
      start,
      ...(end ? { end } : {}),
      extendedProps: {
        department: dept,
        trainer: t.trainer ?? '',
        status: effectiveStatus,
        time: t.time,
        skills: t.skills ?? [],
        venue: t.venue ?? '',
      },
    };
  }

  /**
   * Business rules for Training status:
   * - CANCELLED: explicit cancel action (remark required)
   * - POSTPONED: explicit postpone action
   * - COMPLETED: if any attendee is marked ATTENDED
   * - ACTIVE: when current time is within scheduled start/end time window
   * - PENDING: everything else (including past trainings with no attendance)
   */
  private computeEffectiveStatus(t: Training): Training['status'] {
    const base = String(t.status || '').toUpperCase();
    if (base === 'CANCELLED') return 'CANCELLED' as any;
    if (base === 'POSTPONED') return 'POSTPONED' as any;

    const attendees = Array.isArray(t.attendees) ? t.attendees : [];
    const hasAnyAttended = attendees.some(
      (a: any) => String(a?.status ?? '').toUpperCase() === 'ATTENDED',
    );
    if (hasAnyAttended) return 'COMPLETED' as any;

    // ACTIVE only during the scheduled time window.
    const now = new Date();
    const window = this.getStartEndDateTimes(t.date, t.time);
    if (window?.start && window?.end) {
      if (now >= window.start && now <= window.end) return 'ACTIVE' as any;
      return 'PENDING' as any;
    }
    // If time parsing fails, fall back to date-only: today's trainings are ACTIVE.
    const today = this.getLocalISODate();
    if ((t.date || '').trim() && t.date === today) return 'ACTIVE' as any;
    return 'PENDING' as any;
  }

  private getStartEndDateTimes(date: string, timeRange: string): { start: Date; end: Date } | null {
    const safeDate = (date || '').trim();
    const safeTime = (timeRange || '').trim();
    if (!safeDate || !safeTime) return null;

    const parts = safeTime.split('-').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return null;

    const toDate = (d: string, hhmm: string): Date | null => {
      const m = hhmm.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      if (!m) return null;
      const [y, mo, da] = d.split('-').map((x) => parseInt(x, 10));
      if (!y || !mo || !da) return null;
      const h = parseInt(m[1], 10);
      const mi = parseInt(m[2], 10);
      return new Date(y, mo - 1, da, h, mi, 0, 0);
    };

    const start = toDate(safeDate, parts[0]);
    const end = toDate(safeDate, parts[1]);
    if (!start || !end) return null;
    return { start, end };
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
    { header: 'Venue', key: 'venue', width: 24 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Time', key: 'time', width: 16 },
    { header: 'Departments', key: 'departments', width: 28 },
    { header: 'Skills', key: 'skills', width: 28 },
    { header: 'Trainer', key: 'trainer', width: 22 },
    { header: 'Mode', key: 'mode', width: 16 },
    { header: 'Category', key: 'category', width: 12 },
    { header: 'Type', key: 'type', width: 12 },
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

  const formatTime12 = (input?: string) => {
    const s = (input ?? '').trim();
    if (!s) return '';
    const ampm = s.match(/^([0-9]{1,2}):([0-9]{2})\s*([AaPp][Mm])$/);
    if (ampm) {
      const hh = String(Number(ampm[1])).padStart(2, '0');
      return `${hh}:${ampm[2]} ${ampm[3].toUpperCase()}`;
    }
    const m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!m) return s;
    let h = Number(m[1]);
    const min = m[2];
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${min} ${ap}`;
  };

  const formatTimeRangeIST = (input?: string) => {
    const s = (input ?? '').trim();
    if (!s) return '';
    const parts = s.split('-').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return `${formatTime12(parts[0])} - ${formatTime12(parts[1])} (IST)`;
    return `${formatTime12(s)} (IST)`;
  };

  trainings.forEach((t) => {
    const attendees = Array.isArray(t.attendees) ? t.attendees : [];
    const attendedCount = attendees.filter((a) => a?.status === 'ATTENDED').length;
    const absentCount = attendees.filter((a) => a?.status === 'ABSENT').length;

    sheet.addRow({
      id: t.id,
      topic: t.topic,
      venue: t.venue || '',
      date: t.date,
      time: formatTimeRangeIST(t.time),
      departments: safeJoin(t.departments),
      skills: safeJoin(t.skills),
      trainer: t.trainer || '',
      mode: (t as any).trainingType || '',
      category: (t as any).category || '',
      type: (t as any).type || '',
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
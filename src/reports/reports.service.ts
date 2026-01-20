import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillMatrixService } from '../skill-matrix/skill-matrix.service';
import * as ExcelJS from 'exceljs';
import { SkillGapService } from '../skill-gap/skill-gap.service';
import { TrainingRecommendationService } from 'src/training-recommendation/training-recommendation.service';
import PDFDocument from 'pdfkit';

import { User } from '../users/users.entity';
import { Department } from '../departments/department.entity';
import { Skill } from '../skills/skill.entity';
import { Training } from '../trainings/training.entity';
import { TrainingRequirement } from '../training-requirements/training-requirement.entity';
import { UserType } from '../users/enums/user-type.enum';
import { TrainingType } from '../trainings/enums/training-type.enum';

type AttendanceCounters = {
  staffParticipants: number;
  workerParticipants: number;
  staffHours: number;
  workerHours: number;
  totalParticipants: number;
  totalHours: number;
  internalHours: number;
  externalHours: number;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthLabel(d: Date) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

function safeDateFromISO(iso: string) {
  // iso is expected to be YYYY-MM-DD
  const dt = new Date(`${iso}T00:00:00.000Z`);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function parseDurationHours(timeRange: string): number {
  // UI stores like "10:00 - 12:00" or "10:00-12:00". Fallback to 1 hour if parse fails.
  const s = String(timeRange ?? '').trim();
  const parts = s.split('-').map((p) => p.trim());
  if (parts.length < 2) return 1;
  const toMin = (t: string) => {
    const m = t.match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  };
  const a = toMin(parts[0]);
  const b = toMin(parts[1]);
  if (a === null || b === null) return 1;
  const diff = b - a;
  if (diff <= 0) return 1;
  // allow 30-min increments
  return Math.round((diff / 60) * 10) / 10;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly skillMatrixService: SkillMatrixService,
    private readonly skillGapService: SkillGapService,
    private readonly trainingRecommendationService: TrainingRecommendationService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentsRepo: Repository<Department>,
    @InjectRepository(Skill) private readonly skillsRepo: Repository<Skill>,
    @InjectRepository(Training) private readonly trainingsRepo: Repository<Training>,
    @InjectRepository(TrainingRequirement)
    private readonly trainingReqRepo: Repository<TrainingRequirement>,
  ) {}

  /**
   * Frontend Reports page expects a catalog endpoint.
   * We keep this server-driven so adding new reports doesn't require frontend changes.
   */
  getCatalog(opts?: { departmentId?: number; type?: string }) {
    const reports = [
      {
        id: 'annexure-11-plan-vs-actual-excel',
        name: 'Annexure-11: Target vs Actual (Excel)',
        description:
          'Training programme-wise planned vs actual participants for a selected year (matches your existing Annexure-11 format).',
        type: 'Training',
        exports: [
          {
            label: 'Export Excel',
            format: 'excel',
            url: '/reports/annexure-11/excel?year=2025',
            // year is required; upto is optional (user may provide)
            needs: ['year'],
          },
        ],
      },
      {
        id: 'month-wise-training-excel',
        name: 'Month-Wise Training (Excel)',
        description:
          'Month-wise training session register (SrNo, Trg Code, Programme, Date, Faculty, Sessions, Participants split, Duration, Training Hours).',
        type: 'Training',
        exports: [
          {
            label: 'Export Excel',
            format: 'excel',
            url: '/reports/month-wise/excel?year=2025',
            needs: ['year'],
          },
        ],
      },
      {
        id: 'annexure-12-monthly-summary-excel',
        name: 'Annexure-12: Monthly Summary (Excel)',
        description:
          'Monthly training summary with internal/external hours and % split (matches your Annexure-12 format).',
        type: 'Training',
        exports: [
          {
            label: 'Export Excel',
            format: 'excel',
            url: '/reports/annexure-12/excel?year=2025',
            needs: ['year'],
          },
        ],
      },
      {
        id: 'training-master-record-fy-excel',
        name: 'Training Master Record FY 25-26 (Excel)',
        description:
          'Employee vs training dates attendance matrix (matches your “Training Master Record 25-26” layout).',
        type: 'Training',
        exports: [
          {
            label: 'Export Excel',
            format: 'excel',
            url: '/reports/training-master-record/excel?fy=2025-2026',
            // fy required; start/end are optional overrides
            needs: ['fy'],
          },
        ],
      },
      {
        id: 'skill-matrix-excel',
        name: 'Skill Matrix (Excel)',
        description: 'Employee-wise required vs current skill level with gap and completion %.',
        type: 'Competency',
        exports: [
          {
            label: 'Export Excel',
            format: 'excel',
            url: '/reports/skill-matrix/user/:userId/excel',
            needs: ['userId'],
          },
        ],
      },
      {
        id: 'skill-matrix-pdf',
        name: 'Skill Matrix (PDF)',
        description: 'Printable Skill Matrix for an employee.',
        type: 'Competency',
        exports: [
          {
            label: 'Export PDF',
            format: 'pdf',
            url: '/reports/skill-matrix/user/:userId/pdf',
            needs: ['userId'],
          },
        ],
      },
      {
        id: 'dept-skill-gap-excel',
        name: 'Department Skill Gap (Excel)',
        description: 'Department-wise skill gaps with priority.',
        type: 'Skill Gap',
        exports: [
          {
            label: 'Export Excel',
            format: 'excel',
            url: '/reports/skill-gap/department/:departmentId/excel',
            needs: ['departmentId'],
          },
        ],
      },
      {
        id: 'training-reco-excel',
        name: 'Training Recommendations (Excel)',
        description: 'Recommended trainings for closing skill gaps for an employee.',
        type: 'Training',
        exports: [
          {
            label: 'Export Excel',
            format: 'excel',
            url: '/reports/training-recommendation/user/:userId/excel',
            needs: ['userId'],
          },
        ],
      },
      {
        id: 'training-completion-excel',
        name: 'Training Completion (Excel)',
        description: 'Training-wise attendance/completion summary (optional department filter).',
        type: 'Training',
        exports: [
          {
            label: 'Export Excel',
            format: 'excel',
            url: '/reports/training-completion/excel',
            needs: [],
          },
        ],
      },
      {
        id: 'tni-requirements-excel',
        name: 'TNI Requirements (Excel)',
        description:
          'Employee-wise training needs (OPEN/IN_PROGRESS) with skill gaps and suggested trainings (optional department filter).',
        type: 'TNI',
        exports: [
          {
            label: 'Export Excel',
            format: 'excel',
            url: '/reports/tni-requirements/excel',
            needs: [],
          },
        ],
      },
    ];

    const filtered = reports
      .filter((r) =>
        opts?.type ? String(r.type).toLowerCase() === String(opts.type).toLowerCase() : true,
      )
      .map((r) => r);

    return { reports: filtered };
  }

  async getSummaryCards(opts?: { departmentId?: number }) {
    const [departmentsCount, skillsCount, trainingsCount] = await Promise.all([
      this.departmentsRepo.count(),
      this.skillsRepo.count(),
      this.trainingsRepo.count(),
    ]);

    const usersCount = await this.usersRepo.count(
      opts?.departmentId
        ? {
            where: {
              department: { id: opts.departmentId } as any,
            },
          }
        : undefined,
    );

    return {
      cards: [
        { title: opts?.departmentId ? 'Employees (Dept)' : 'Employees', value: usersCount },
        { title: 'Departments', value: departmentsCount },
        { title: 'Skills', value: skillsCount },
        { title: 'Trainings', value: trainingsCount },
      ],
    };
  }

  async generateUserSkillMatrixExcel(userId: number) {
    const data = await this.skillMatrixService.getUserSkillMatrix(userId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Skill Matrix');

    // Header
    sheet.addRow(['Skill', 'Required Level', 'Current Level', 'Gap']);

    // Data
    data.skills.forEach((s) => {
      sheet.addRow([s.skillName, s.requiredLevel, s.currentLevel, s.gap]);
    });

    sheet.addRow([]);
    sheet.addRow(['Completion %', data.summary.completionPercentage]);

    return workbook;
  }

  async generateDepartmentSkillGapExcel(departmentId: number) {
    const data = await this.skillGapService.getDepartmentSkillGap(departmentId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Department Skill Gap');

    sheet.addRow(['Skill', 'Employees Affected', 'Average Gap', 'Priority']);

    data.skillGaps.forEach((s) => {
      sheet.addRow([s.skillName, s.employeesAffected, s.averageGap, s.priority]);
    });

    return workbook;
  }

  async generateTrainingRecommendationExcel(userId: number) {
    const data = await this.trainingRecommendationService.getUserTrainingRecommendations(userId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Training Recommendations');

    sheet.addRow(['Training', 'Priority', 'Skills Covered']);

    data.recommendations.forEach((r) => {
      sheet.addRow([r.title, r.priority, r.skillsCovered.join(', ')]);
    });

    return workbook;
  }

  async generateSkillMatrixPDF(userId: number) {
    const data = await this.skillMatrixService.getUserSkillMatrix(userId);

    const doc = new PDFDocument();

    doc.fontSize(16).text('Skill Matrix Report');
    doc.moveDown();

    doc.fontSize(12).text(`Employee: ${data.user.name}`);
    doc.text(`Designation: ${data.user.designation}`);
    doc.moveDown();

    data.skills.forEach((s) => {
      doc.text(`${s.skillName} | Required: ${s.requiredLevel} | Current: ${s.currentLevel} | Gap: ${s.gap}`);
    });

    return doc;
  }

  async generateTrainingCompletionExcel(departmentId?: number) {
    const all = await this.trainingsRepo.find({
      order: { date: 'DESC' as any },
    });

    // Department filtering: trainings store departments as string[]
    const trainings = departmentId
      ? all.filter((t) => Array.isArray(t.departments) && t.departments.some((d) => String(d) === String(departmentId)))
      : all;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Training Completion');

    sheet.addRow(['Training Topic', 'Date', 'Time', 'Status', 'Departments', 'Assigned', 'Attended', 'Completion %']);

    trainings.forEach((t) => {
      const assigned = Array.isArray(t.assignedEmployees) ? t.assignedEmployees.length : 0;
      const attended = Array.isArray(t.attendees)
        ? t.attendees.filter((a) => (a as any)?.status === 'ATTENDED' || (a as any)?.status === 'Attended').length
        : 0;
      const completion = assigned > 0 ? Math.round((attended / assigned) * 100) : 0;

      sheet.addRow([
        t.topic,
        t.date,
        t.time,
        t.status,
        Array.isArray(t.departments) ? t.departments.join(', ') : '',
        assigned,
        attended,
        `${completion}%`,
      ]);
    });

    return workbook;
  }

  /**
   * TNI Requirements report
   * - Shows OPEN/IN_PROGRESS training requirements
   * - Optional filter by departmentId
   */
  async generateTniRequirementsExcel(departmentId?: number) {
    const where: any = [{ status: 'OPEN' }, { status: 'IN_PROGRESS' }];

    const all = await this.trainingReqRepo.find({
      where,
      order: { updatedAt: 'DESC' as any },
      relations: ['user', 'user.department', 'user.designation', 'skill', 'suggestedTraining'],
    });

    const rows = (departmentId
      ? all.filter((r) => String((r as any)?.user?.department?.id) === String(departmentId))
      : all
    ).sort((a, b) => {
      const w = (p: any) => (p === 'HIGH' ? 0 : p === 'MEDIUM' ? 1 : 2);
      const dw = w((a as any).priority) - w((b as any).priority);
      if (dw !== 0) return dw;
      return new Date((b as any).updatedAt as any).getTime() - new Date((a as any).updatedAt as any).getTime();
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('TNI Requirements');

    sheet.addRow([
      'Employee',
      'Department',
      'Designation',
      'Skill',
      'Required Level',
      'Current Level',
      'Gap',
      'Priority',
      'Status',
      'Suggested Training',
      'Suggested Topic',
      'Updated At',
    ]);

    // Style header
    const header = sheet.getRow(1);
    header.font = { bold: true };

    for (const r of rows) {
      sheet.addRow([
        (r as any)?.user?.name ?? '',
        (r as any)?.user?.department?.name ?? '',
        (r as any)?.user?.designation?.title ?? (r as any)?.user?.designation?.name ?? '',
        (r as any)?.skill?.name ?? '',
        (r as any)?.requiredLevel,
        (r as any)?.currentLevel,
        (r as any)?.gap,
        (r as any)?.priority,
        (r as any)?.status,
        (r as any)?.suggestedTraining?.topic ?? '',
        (r as any)?.suggestedTopic ?? '',
        (r as any)?.updatedAt ? new Date((r as any).updatedAt).toISOString().slice(0, 10) : '',
      ]);
    }

    // Auto width (basic) - strict TS safe
    (sheet.columns ?? [])
      .filter((c): c is NonNullable<typeof c> => c !== undefined)
      .forEach((col) => {
        let max = 10;

        // ✅ ExcelJS typings: eachCell can be possibly undefined → use optional chaining
        col.eachCell?.({ includeEmpty: true }, (cell) => {
          const v = cell.value ? String(cell.value) : '';
          max = Math.max(max, Math.min(50, v.length + 2));
        });

        col.width = max;
      });

    return workbook;
  }

  // =====================================================
  // CUSTOM EXCEL REPORTS (matching provided templates)
  // =====================================================

  private async buildEmployeeTypeMap(): Promise<Map<string, UserType>> {
    const users = await this.usersRepo.find({
      where: { isActive: true } as any,
      order: { id: 'ASC' as any },
    });
    const map = new Map<string, UserType>();
    for (const u of users) {
      if (u?.employeeId) map.set(String(u.employeeId), (u as any).employeeType);
    }
    return map;
  }

  private getTrainingPeople(t: Training) {
    // Prefer explicit attendees list (can include ATTENDED/ABSENT). Fallback to assigned employees.
    const attendees = Array.isArray(t.attendees) ? (t.attendees as any[]) : [];
    const assigned = Array.isArray(t.assignedEmployees) ? (t.assignedEmployees as any[]) : [];

    const attended = attendees.length
      ? attendees.filter((a) => String((a as any)?.status ?? '').toUpperCase() === 'ATTENDED')
      : [];

    return {
      plannedList: assigned.length ? assigned : attendees,
      actualList: attended.length ? attended : attendees,
      assignedCount: assigned.length,
      attendeesCount: attendees.length,
      attendedCount: attended.length ? attended.length : attendees.length,
    };
  }

  private countAttendance(
    t: Training,
    employeeTypeMap: Map<string, UserType>,
    opts?: { useActual?: boolean },
  ): AttendanceCounters {
    const duration = parseDurationHours(t.time);
    const people = this.getTrainingPeople(t);
    const list = opts?.useActual ? people.actualList : people.plannedList;

    let staff = 0;
    let worker = 0;
    for (const p of list) {
      const empId = String((p as any)?.empId ?? (p as any)?.employeeId ?? '').trim();
      if (!empId) continue;
      const typ = employeeTypeMap.get(empId);
      if (typ === UserType.WORKER) worker += 1;
      else staff += 1;
    }

    const staffHours = staff * duration;
    const workerHours = worker * duration;
    const totalHours = staffHours + workerHours;
    const internalHours = (t.trainingType === TrainingType.INTERNAL ? totalHours : 0) as number;
    const externalHours = (t.trainingType === TrainingType.EXTERNAL ? totalHours : 0) as number;

    return {
      staffParticipants: staff,
      workerParticipants: worker,
      staffHours,
      workerHours,
      totalParticipants: staff + worker,
      totalHours,
      internalHours,
      externalHours,
    };
  }

  /**
   * Annexure-11: Target vs Actual
   * Columns: Sr No, Training Programme Code, Programme Name, Planned Nos - {year}, Actual Nos - {year} (upto ...)
   */
  async generateAnnexure11Excel(year: number, uptoIsoDate?: string) {
    const upto = uptoIsoDate ? safeDateFromISO(uptoIsoDate) : null;
    const employeeTypeMap = await this.buildEmployeeTypeMap();

    const all = await this.trainingsRepo.find({ order: { date: 'ASC' as any } });
    const trainings = all.filter((t) => {
      const dt = safeDateFromISO(t.date);
      if (!dt) return false;
      if (dt.getUTCFullYear() !== year) return false;
      if (upto && dt.getTime() > upto.getTime()) return false;
      return true;
    });

    // group by topic (programme)
    const byTopic = new Map<string, { planned: number; actual: number; sampleId: number }>();
    for (const t of trainings) {
      const k = String(t.topic ?? '').trim() || `Training-${t.id}`;
      const people = this.getTrainingPeople(t);
      const planned = people.assignedCount || people.attendeesCount;
      const actual = people.attendedCount;
      const cur = byTopic.get(k) ?? { planned: 0, actual: 0, sampleId: t.id };
      cur.planned += planned;
      cur.actual += actual;
      if (!cur.sampleId) cur.sampleId = t.id;
      byTopic.set(k, cur);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('target vs actual 11');

    // Match your template: title rows + header in row 4
    sheet.getRow(1).values = ['TRAINING ANALYSIS'];
    sheet.getRow(2).values = [`Target vs Actual - ${year}`];
    sheet.addRow([]);

    const hdrRow = sheet.getRow(4);
    hdrRow.values = [
      'Sr. No.',
      'Training Programme Code',
      'Programme Name',
      `Planned Nos - ${year}`,
      uptoIsoDate ? `Actual Nos - ${year} (upto ${uptoIsoDate})` : `Actual Nos - ${year}`,
    ];
    hdrRow.font = { bold: true };

    let i = 1;
    for (const [topic, v] of Array.from(byTopic.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      sheet.addRow([i, `TRG-${String(v.sampleId).padStart(4, '0')}`, topic, v.planned, v.actual]);
      i += 1;
    }

    // widths
    (sheet.columns ?? []).forEach((c) => {
      if (!c) return;
      c.width = Math.max(14, Math.min(55, (c.header ? String(c.header).length : 12) + 3));
    });

    return workbook;
  }

  /**
   * Month-Wise: Training register
   */
  async generateMonthWiseExcel(year: number) {
    const employeeTypeMap = await this.buildEmployeeTypeMap();
    const all = await this.trainingsRepo.find({ order: { date: 'ASC' as any } });
    const trainings = all.filter((t) => {
      const dt = safeDateFromISO(t.date);
      return !!dt && dt.getUTCFullYear() === year;
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Month-Wise -${year}`);

    sheet.getRow(1).values = ['TRAINING ANALYSIS'];
    sheet.getRow(2).values = [`Month-Wise - ${year}`];
    sheet.addRow([]);

    const header = sheet.getRow(4);
    header.values = [
      'Sr. No.',
      'Trg Code',
      'Programmes',
      'Date of Session',
      'Faculty',
      'No. of Sessions',
      'Total No. of Participants',
      'Participants Staff',
      'Participants Workers',
      'Duration',
      'Trg Hours Staff',
      'Trg Hours Workers',
      'Total Trg Hours',
    ];
    header.font = { bold: true };

    let sr = 1;
    for (const t of trainings) {
      const dur = parseDurationHours(t.time);
      const counts = this.countAttendance(t, employeeTypeMap, { useActual: true });
      sheet.addRow([
        sr,
        `TRG-${String(t.id).padStart(4, '0')}`,
        t.topic,
        t.date,
        t.trainer ?? '',
        1,
        counts.totalParticipants,
        counts.staffParticipants,
        counts.workerParticipants,
        `${dur} Hr`,
        counts.staffHours,
        counts.workerHours,
        counts.totalHours,
      ]);
      sr += 1;
    }

    // basic widths
    const widths = [8, 14, 34, 16, 20, 16, 22, 20, 22, 12, 18, 18, 18];
    (sheet.columns ?? []).forEach((c, idx) => {
      if (!c) return;
      c.width = widths[idx] ?? 16;
    });

    return workbook;
  }

  /**
   * Annexure-12: Monthly summary with internal/external split
   */
  async generateAnnexure12Excel(year: number) {
    const employeeTypeMap = await this.buildEmployeeTypeMap();
    const all = await this.trainingsRepo.find({ order: { date: 'ASC' as any } });
    const trainings = all.filter((t) => {
      const dt = safeDateFromISO(t.date);
      return !!dt && dt.getUTCFullYear() === year;
    });

    const agg = new Map<string, AttendanceCounters>();
    const anyDate = new Map<string, Date>();

    for (const t of trainings) {
      const dt = safeDateFromISO(t.date);
      if (!dt) continue;
      const k = monthKey(dt);
      anyDate.set(k, dt);
      const c = this.countAttendance(t, employeeTypeMap, { useActual: true });
      const cur =
        agg.get(k) ??
        ({
          staffParticipants: 0,
          workerParticipants: 0,
          staffHours: 0,
          workerHours: 0,
          totalParticipants: 0,
          totalHours: 0,
          internalHours: 0,
          externalHours: 0,
        } satisfies AttendanceCounters);

      cur.staffParticipants += c.staffParticipants;
      cur.workerParticipants += c.workerParticipants;
      cur.staffHours += c.staffHours;
      cur.workerHours += c.workerHours;
      cur.totalParticipants += c.totalParticipants;
      cur.totalHours += c.totalHours;
      cur.internalHours += c.internalHours;
      cur.externalHours += c.externalHours;
      agg.set(k, cur);
    }

    // sessions per month
    const sessionsByMonth = new Map<string, number>();
    for (const t of trainings) {
      const dt = safeDateFromISO(t.date);
      if (!dt) continue;
      const k = monthKey(dt);
      sessionsByMonth.set(k, (sessionsByMonth.get(k) ?? 0) + 1);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Annexure 12 - ${year}`);

    sheet.getRow(1).values = [`Annexure 12 - ${year}`];
    sheet.getRow(2).values = ['Monthly Training Summary'];

    // Header row 3 (keep similar to your file - 2 header rows already)
    const header = sheet.getRow(3);
    header.values = [
      'Month-Year',
      'Sessions',
      'Staff Participants',
      'Staff Total Trng Hrs',
      'Workers Participants',
      'Workers Total Trng Hrs',
      'Total Participants',
      'Internal Training Hours',
      'External Training Hours',
      'Training Total Hours',
      '% Internal',
      '% External',
      '% Total',
    ];
    header.font = { bold: true };

    const keys = Array.from(agg.keys()).sort();
    let rowIdx = 4;
    for (const k of keys) {
      const dt = anyDate.get(k) ?? new Date(`${k}-01T00:00:00.000Z`);
      const c = agg.get(k)!;
      const sessions = sessionsByMonth.get(k) ?? 0;
      const totalHrs = c.totalHours;
      const pInt = totalHrs > 0 ? Math.round((c.internalHours / totalHrs) * 100) : 0;
      const pExt = totalHrs > 0 ? Math.round((c.externalHours / totalHrs) * 100) : 0;
      const pTot = pInt + pExt;

      sheet.getRow(rowIdx).values = [
        monthLabel(dt),
        sessions,
        c.staffParticipants,
        c.staffHours,
        c.workerParticipants,
        c.workerHours,
        c.totalParticipants,
        c.internalHours,
        c.externalHours,
        totalHrs,
        `${pInt}%`,
        `${pExt}%`,
        `${pTot}%`,
      ];
      rowIdx += 1;
    }

    const widths = [12, 10, 18, 18, 20, 20, 18, 22, 22, 20, 12, 12, 10];
    (sheet.columns ?? []).forEach((c, idx) => {
      if (!c) return;
      c.width = widths[idx] ?? 16;
    });

    return workbook;
  }

  /**
   * Training Master Record FY 25-26: Employee vs Training Date matrix
   * Query params:
   * - fy=2025-2026 (default) OR start=YYYY-MM-DD&end=YYYY-MM-DD
   */
  async generateTrainingMasterRecordExcel(opts?: { fy?: string; start?: string; end?: string }) {
    const fy = String(opts?.fy ?? '2025-2026');
    const startIso = opts?.start ?? '2025-04-01';
    const endIso = opts?.end ?? '2026-03-31';
    const start = safeDateFromISO(startIso);
    const end = safeDateFromISO(endIso);

    const users = await this.usersRepo.find({
      where: { isActive: true } as any,
      order: { id: 'ASC' as any },
    });

    const allTrainings = await this.trainingsRepo.find({ order: { date: 'ASC' as any } });
    const trainings = allTrainings.filter((t) => {
      const dt = safeDateFromISO(t.date);
      if (!dt) return false;
      if (start && dt.getTime() < start.getTime()) return false;
      if (end && dt.getTime() > end.getTime()) return false;
      return true;
    });

    // Unique date columns
    const dateCols = Array.from(new Set(trainings.map((t) => t.date))).sort();

    // Build quick attendance map: date -> empId -> boolean
    const attendedByDate = new Map<string, Set<string>>();
    for (const t of trainings) {
      const people = this.getTrainingPeople(t);
      const list = people.actualList;
      const set = attendedByDate.get(t.date) ?? new Set<string>();
      for (const p of list) {
        const empId = String((p as any)?.empId ?? (p as any)?.employeeId ?? '').trim();
        if (empId) set.add(empId);
      }
      attendedByDate.set(t.date, set);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Training Master Record 25-26');

    // Row 1: dates across
    const baseHeaders = ['S. No', 'FULLNAME', 'CODE', 'DOJ', 'DEPARTMENT', 'DESIGNATION'];
    const row1 = sheet.getRow(1);
    row1.values = [...baseHeaders, ...dateCols];

    // Row 2: topic name per date column (take first training on that date)
    const topicByDate = new Map<string, string>();
    for (const d of dateCols) {
      const first = trainings.find((t) => t.date === d);
      topicByDate.set(d, first?.topic ?? '');
    }
    sheet.getRow(2).values = [
      '',
      '',
      '',
      '',
      '',
      'TOPIC NAME',
      ...dateCols.map((d) => topicByDate.get(d) ?? ''),
    ];

    // Row 3: trainer name per date column
    const trainerByDate = new Map<string, string>();
    for (const d of dateCols) {
      const first = trainings.find((t) => t.date === d);
      trainerByDate.set(d, first?.trainer ?? '');
    }
    sheet.getRow(3).values = [
      '',
      '',
      '',
      '',
      '',
      "TRAINER'S NAME",
      ...dateCols.map((d) => trainerByDate.get(d) ?? ''),
    ];

    // Data rows
    let r = 4;
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const doj = u.dateOfJoining ? new Date(u.dateOfJoining).toISOString().slice(0, 10) : '';
      const dept = (u as any)?.department?.name ?? '';
      const desg = (u as any)?.designation?.title ?? (u as any)?.designation?.name ?? '';

      const rowVals: any[] = [
        i + 1,
        u.name,
        u.employeeId,
        doj,
        dept,
        desg,
      ];

      for (const d of dateCols) {
        const set = attendedByDate.get(d) ?? new Set<string>();
        rowVals.push(set.has(String(u.employeeId)) ? 'YES' : '');
      }

      sheet.getRow(r).values = rowVals;
      r += 1;
    }

    // Styling: make first 3 rows bold-ish
    [1, 2, 3].forEach((rn) => {
      const rr = sheet.getRow(rn);
      rr.font = { bold: true };
    });

    // widths
    const fixed = [8, 26, 12, 12, 18, 18];
    (sheet.columns ?? []).forEach((c, idx) => {
      if (!c) return;
      if (idx < fixed.length) c.width = fixed[idx];
      else c.width = 14;
    });

    // Freeze top 3 rows and 6 columns
    sheet.views = [{ state: 'frozen', xSplit: 6, ySplit: 3 }];

    // Put FY label in properties (harmless)
    workbook.creator = 'Training System';
    // exceljs typings (WorkbookProperties) may not include "subject" in some versions.
    // Set it via a safe cast to avoid TS2339 while still writing the metadata into the file.
    (workbook.properties as any).subject = `Training Master Record ${fy}`;

    return workbook;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillMatrixService } from '../skill-matrix/skill-matrix.service';
import * as ExcelJS from 'exceljs';
import { SkillGapService } from '../skill-gap/skill-gap.service';
import { TrainingRecommendationService } from 'src/training-recommendation/training-recommendation.service';
import * as PDFDocument from 'pdfkit';
import { User } from '../users/users.entity';
import { Department } from '../departments/department.entity';
import { Skill } from '../skills/skill.entity';
import { Training } from '../trainings/training.entity';

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
  ) {}

  /**
   * Frontend Reports page expects a catalog endpoint.
   * We keep this server-driven so adding new reports doesn't require frontend changes.
   */
  getCatalog(opts?: { departmentId?: number; type?: string }) {
    const reports = [
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
    ];

    const filtered = reports
      .filter((r) => (opts?.type ? String(r.type).toLowerCase() === String(opts.type).toLowerCase() : true))
      // departmentId is handled at export time for the specific report that needs it
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
    const data =
      await this.skillMatrixService.getUserSkillMatrix(
        userId,
      );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(
      'Skill Matrix',
    );

    // Header
    sheet.addRow([
      'Skill',
      'Required Level',
      'Current Level',
      'Gap',
    ]);

    // Data
    data.skills.forEach((s) => {
      sheet.addRow([
        s.skillName,
        s.requiredLevel,
        s.currentLevel,
        s.gap,
      ]);
    });

    sheet.addRow([]);
    sheet.addRow([
      'Completion %',
      data.summary.completionPercentage,
    ]);

    return workbook;
  }
  async generateDepartmentSkillGapExcel(
  departmentId: number,
) {
  const data =
    await this.skillGapService.getDepartmentSkillGap(
      departmentId,
    );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(
    'Department Skill Gap',
  );

  sheet.addRow([
    'Skill',
    'Employees Affected',
    'Average Gap',
    'Priority',
  ]);

  data.skillGaps.forEach((s) => {
    sheet.addRow([
      s.skillName,
      s.employeesAffected,
      s.averageGap,
      s.priority,
    ]);
  });

  return workbook;
}
async generateTrainingRecommendationExcel(
  userId: number,
) {
  const data =
    await this.trainingRecommendationService.getUserTrainingRecommendations(
      userId,
    );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(
    'Training Recommendations',
  );

  sheet.addRow([
    'Training',
    'Priority',
    'Skills Covered',
  ]);

  data.recommendations.forEach((r) => {
    sheet.addRow([
      r.title,
      r.priority,
      r.skillsCovered.join(', '),
    ]);
  });

  return workbook;
}


async generateSkillMatrixPDF(userId: number) {
  const data =
    await this.skillMatrixService.getUserSkillMatrix(
      userId,
    );

  const doc = new PDFDocument();

  doc.fontSize(16).text('Skill Matrix Report');
  doc.moveDown();

  doc.fontSize(12).text(
    `Employee: ${data.user.name}`,
  );
  doc.text(
    `Designation: ${data.user.designation}`,
  );
  doc.moveDown();

  data.skills.forEach((s) => {
    doc.text(
      `${s.skillName} | Required: ${s.requiredLevel} | Current: ${s.currentLevel} | Gap: ${s.gap}`,
    );
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


}

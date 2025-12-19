import { Injectable } from '@nestjs/common';
import { SkillMatrixService } from '../skill-matrix/skill-matrix.service';
import * as ExcelJS from 'exceljs';
import { SkillGapService } from '../skill-gap/skill-gap.service';
import { TrainingRecommendationService } from 'src/training-recommendation/training-recommendation.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
  constructor(
    private readonly skillMatrixService: SkillMatrixService,
  private readonly skillGapService: SkillGapService,
  private readonly trainingRecommendationService:
    TrainingRecommendationService,
  ) {}

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


}

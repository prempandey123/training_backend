import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly service: ReportsService,
  ) {}

  // ===============================
  // REPORTS CATALOG (UI)
  // ===============================
  @Get('catalog')
  getCatalog(
    @Query('departmentId') departmentId?: string,
    @Query('type') type?: string,
  ) {
    const dep = departmentId ? Number(departmentId) : undefined;
    return this.service.getCatalog({
      departmentId: Number.isFinite(dep as any) ? (dep as number) : undefined,
      type,
    });
  }

  // ===============================
  // REPORTS SUMMARY (UI)
  // ===============================
  @Get('summary')
  async getSummary(
    @Query('departmentId') departmentId?: string,
  ) {
    const dep = departmentId ? Number(departmentId) : undefined;
    return this.service.getSummaryCards({
      departmentId: Number.isFinite(dep as any) ? (dep as number) : undefined,
    });
  }

  // ===============================
  // SKILL MATRIX (EXCEL)
  // ===============================
  @Get('skill-matrix/user/:userId/excel')
  async downloadSkillMatrixExcel(
    @Param('userId', ParseIntPipe) userId: number,
    @Res() res: Response,
  ) {
    const workbook =
      await this.service.generateUserSkillMatrixExcel(
        userId,
      );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=skill-matrix.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // ===============================
  // DEPARTMENT SKILL GAP (EXCEL)
  // ===============================
  @Get('skill-gap/department/:departmentId/excel')
  async downloadDepartmentSkillGapExcel(
    @Param('departmentId', ParseIntPipe)
    departmentId: number,
    @Res() res: Response,
  ) {
    const workbook =
      await this.service.generateDepartmentSkillGapExcel(
        departmentId,
      );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=department-skill-gap.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // ===============================
  // SKILL MATRIX (PDF)
  // ===============================
  @Get('skill-matrix/user/:userId/pdf')
  async downloadSkillMatrixPdf(
    @Param('userId', ParseIntPipe) userId: number,
    @Res() res: Response,
  ) {
    const pdfDoc =
      await this.service.generateSkillMatrixPDF(
        userId,
      );

    res.setHeader(
      'Content-Type',
      'application/pdf',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=skill-matrix.pdf',
    );

    pdfDoc.pipe(res);
    pdfDoc.end();
  }

  // ===============================
  // TRAINING RECOMMENDATION (EXCEL)
  // ===============================
  @Get('training-recommendation/user/:userId/excel')
  async downloadTrainingRecommendationExcel(
    @Param('userId', ParseIntPipe) userId: number,
    @Res() res: Response,
  ) {
    const workbook =
      await this.service.generateTrainingRecommendationExcel(
        userId,
      );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=training-recommendation.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // ===============================
  // TRAINING COMPLETION (EXCEL)
  // ===============================
  @Get('training-completion/excel')
  async downloadTrainingCompletionExcel(
    @Query('departmentId') departmentId: string | undefined,
    @Res() res: Response,
  ) {
    const dep = departmentId ? Number(departmentId) : undefined;
    const workbook = await this.service.generateTrainingCompletionExcel(
      Number.isFinite(dep as any) ? (dep as number) : undefined,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=training-completion.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // ===============================
  // ANNEXURE-11 (EXCEL)
  // ===============================
  @Get('annexure-11/excel')
  async downloadAnnexure11Excel(
    @Query('year') year: string | undefined,
    @Query('upto') upto: string | undefined,
    @Res() res: Response,
  ) {
    const y = year ? Number(year) : new Date().getFullYear();
    const workbook = await this.service.generateAnnexure11Excel(
      Number.isFinite(y as any) ? (y as number) : new Date().getFullYear(),
      upto,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=annexure-11-${y}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // ===============================
  // MONTH-WISE (EXCEL)
  // ===============================
  @Get('month-wise/excel')
  async downloadMonthWiseExcel(
    @Query('year') year: string | undefined,
    @Res() res: Response,
  ) {
    const y = year ? Number(year) : new Date().getFullYear();
    const workbook = await this.service.generateMonthWiseExcel(
      Number.isFinite(y as any) ? (y as number) : new Date().getFullYear(),
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=month-wise-${y}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // ===============================
  // ANNEXURE-12 (EXCEL)
  // ===============================
  @Get('annexure-12/excel')
  async downloadAnnexure12Excel(
    @Query('year') year: string | undefined,
    @Res() res: Response,
  ) {
    const y = year ? Number(year) : new Date().getFullYear();
    const workbook = await this.service.generateAnnexure12Excel(
      Number.isFinite(y as any) ? (y as number) : new Date().getFullYear(),
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=annexure-12-${y}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // ===============================
  // TRAINING MASTER RECORD FY (EXCEL)
  // ===============================
  @Get('training-master-record/excel')
  async downloadTrainingMasterRecordExcel(
    @Query('fy') fy: string | undefined,
    @Query('start') start: string | undefined,
    @Query('end') end: string | undefined,
    @Res() res: Response,
  ) {
    const workbook = await this.service.generateTrainingMasterRecordExcel({ fy, start, end });
    const fileName = fy ? `training-master-record-${fy}.xlsx` : 'training-master-record.xlsx';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // ===============================
  // TNI REQUIREMENTS (EXCEL)
  // ===============================
  @Get('tni-requirements/excel')
  async downloadTniRequirementsExcel(
    @Query('departmentId') departmentId: string | undefined,
    @Res() res: Response,
  ) {
    const dep = departmentId ? Number(departmentId) : undefined;
    const workbook = await this.service.generateTniRequirementsExcel(
      Number.isFinite(dep as any) ? (dep as number) : undefined,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=tni-requirements.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}

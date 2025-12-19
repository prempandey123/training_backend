import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
}

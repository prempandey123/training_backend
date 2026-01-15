import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CreateTrainingDto } from './dto/create-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { TrainingService } from './training.service';

@Controller('trainings')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post()
  create(@Body() dto: CreateTrainingDto) {
    return this.trainingService.create(dto);
  }

  // Send training mail to selected participants without creating a training (used by UI 'Send mail to participants' button).
  @Post('send-mail-preview')
  sendMailPreview(@Body() dto: CreateTrainingDto) {
    return this.trainingService.sendMailPreview(dto);
  }

  @Get()
  findAll() {
    return this.trainingService.findAll();
  }


// ===============================
// TRAINING LIST (EXCEL EXPORT)
// ===============================
@Get('excel')
async downloadExcel(@Res() res: Response) {
  const workbook = await this.trainingService.generateTrainingListExcel();

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=training-list.xlsx',
  );

  await workbook.xlsx.write(res);
  res.end();
}

  /**
   * Calendar-friendly projection of trainings.
   * Keeps existing /trainings response intact, while providing a
   * lightweight shape that FullCalendar can consume directly.
   */
  @Get('calendar')
  getCalendarEvents() {
    return this.trainingService.getCalendarEvents();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.findOne(id);
  }

  /**
   * Placeholder: biometric device sync.
   * Backend logic will be integrated later; for now we expose a stable endpoint
   * so the frontend can wire the UX.
   */
  @Get(':id/biometric')
  getBiometric(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.getBiometricSnapshot(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTrainingDto) {
    return this.trainingService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.remove(id);
  }
}
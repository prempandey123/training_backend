import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnnualTrainingCalendarService } from './annual-training-calendar.service';

@Controller('annual-training-calendar')
export class AnnualTrainingCalendarController {
  constructor(private readonly service: AnnualTrainingCalendarService) {}

  @Get()
  async list() {
    return this.service.listAll();
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.service.importFile(file, academicYear || '2025-26');
  }
}

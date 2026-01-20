import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnualTrainingCalendar } from './annual-training-calendar.entity';
import { AnnualTrainingCalendarService } from './annual-training-calendar.service';
import { AnnualTrainingCalendarController } from './annual-training-calendar.controller';
import { AnnualTrainingCalendarSchemaService } from './annual-training-calendar.schema';

@Module({
  imports: [TypeOrmModule.forFeature([AnnualTrainingCalendar])],
  providers: [AnnualTrainingCalendarService, AnnualTrainingCalendarSchemaService],
  controllers: [AnnualTrainingCalendarController],
  exports: [AnnualTrainingCalendarService],
})
export class AnnualTrainingCalendarModule {}

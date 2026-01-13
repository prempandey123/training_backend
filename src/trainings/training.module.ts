import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { Training } from './training.entity';
import { User } from '../users/users.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrainingReminderService } from './training.reminder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Training, User]), NotificationsModule],
  controllers: [TrainingController],
  providers: [TrainingService, TrainingReminderService],
  exports: [TrainingService],
})
export class TrainingModule {}

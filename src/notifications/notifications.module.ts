import { Module } from '@nestjs/common';
import { BrevoEmailService } from './services/brevo-email.service';

@Module({
  providers: [BrevoEmailService],
  exports: [BrevoEmailService],
})
export class NotificationsModule {}

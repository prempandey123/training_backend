import { Injectable, Logger } from '@nestjs/common';

type BrevoEmailRecipient = { email: string; name?: string };

@Injectable()
export class BrevoEmailService {
  private readonly logger = new Logger(BrevoEmailService.name);

  private get apiKey(): string {
    return process.env.BREVO_API_KEY ?? '';
  }

  private get senderEmail(): string {
    return process.env.BREVO_FROM_EMAIL ?? '';
  }

  private get senderName(): string {
    return process.env.BREVO_FROM_NAME ?? 'Training Team';
  }

  /**
   * Sends a transactional email via Brevo (Sendinblue) API v3.
   * Docs: https://developers.brevo.com/reference/sendtransacemail
   */
  async sendMail(to: BrevoEmailRecipient | BrevoEmailRecipient[], subject: string, htmlContent: string) {
    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY is not set. Skipping email send.');
      return;
    }
    if (!this.senderEmail) {
      this.logger.warn('BREVO_FROM_EMAIL is not set. Skipping email send.');
      return;
    }

    const toList = Array.isArray(to) ? to : [to];

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: { email: this.senderEmail, name: this.senderName },
          to: toList,
          subject,
          htmlContent,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.error(`Brevo send failed: ${res.status} ${res.statusText} ${text}`);
      }
    } catch (err: any) {
      this.logger.error('Brevo send failed (network/runtime).', err?.message ?? String(err));
    }
  }

  trainingCreatedHtml(training: { topic: string; date: string; time: string; trainer?: string | null }) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5">
        <h2>Training Assigned</h2>
        <p>You have been assigned a training.</p>
        <p><b>Topic:</b> ${training.topic}</p>
        <p><b>Date:</b> ${training.date}</p>
        <p><b>Time:</b> ${training.time}</p>
        ${training.trainer ? `<p><b>Trainer:</b> ${training.trainer}</p>` : ''}
      </div>
    `;
  }

  reminderHtml(
    title: string,
    training: { topic: string; date: string; time: string; trainer?: string | null },
    message: string,
  ) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5">
        <h2>${title}</h2>
        <p>${message}</p>
        <p><b>Topic:</b> ${training.topic}</p>
        <p><b>Date:</b> ${training.date}</p>
        <p><b>Time:</b> ${training.time}</p>
        ${training.trainer ? `<p><b>Trainer:</b> ${training.trainer}</p>` : ''}
      </div>
    `;
  }
}

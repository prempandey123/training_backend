import { Injectable, Logger } from '@nestjs/common';

type BrevoEmailRecipient = { email: string; name?: string };

@Injectable()
export class BrevoEmailService {
  private readonly logger = new Logger(BrevoEmailService.name);

  private get apiKey(): string {
    return (process.env.BREVO_API_KEY ?? '').trim();
  }

  private get senderEmail(): string {
    return (process.env.BREVO_FROM_EMAIL ?? '').trim();
  }

  private get senderName(): string {
    return (process.env.BREVO_FROM_NAME ?? 'Training Team').trim();
  }

  private formatDate(input: string): string {
    // input could be "2026-01-16"
    // keeping it simple & safe: if parsing fails, return original
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return input;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private escapeHtml(s: string): string {
    return (s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Sends a transactional email via Brevo (Sendinblue) API v3.
   * Docs: https://developers.brevo.com/reference/sendtransacemail
   */
  async sendMail(
    to: BrevoEmailRecipient | BrevoEmailRecipient[],
    subject: string,
    htmlContent: string,
  ) {
    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY is not set. Skipping email send.');
      return;
    }
    if (!this.senderEmail) {
      this.logger.warn('BREVO_FROM_EMAIL is not set. Skipping email send.');
      return;
    }
    if (typeof (globalThis as any).fetch !== 'function') {
      this.logger.error('Global fetch() not found. Use Node 18+ or add a fetch polyfill.');
      return;
    }

    const toList = Array.isArray(to) ? to : [to];

    // basic plain text fallback from html (very simple)
    const textContent =
      htmlContent
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/h\d>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim() || subject;

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
          textContent,
          // optional, safe:
          // replyTo: { email: this.senderEmail, name: this.senderName },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(
          `Brevo send failed: ${res.status} ${res.statusText} ${body}`.slice(0, 2000),
        );
        return;
      }

      // helpful debug (optional)
      const okBody = await res.text().catch(() => '');
      this.logger.log(`Brevo send ok: ${res.status} ${okBody}`.slice(0, 500));
    } catch (err: any) {
      this.logger.error('Brevo send failed (network/runtime).', err?.message ?? String(err));
    }
  }

  /**
   * Improved training assignment email (nice looking)
   */
  trainingCreatedHtml(training: { topic: string; date: string; time: string; trainer?: string | null }) {
    const topic = this.escapeHtml(training.topic);
    const date = this.escapeHtml(this.formatDate(training.date));
    const time = this.escapeHtml(training.time);
    const trainer = training.trainer ? this.escapeHtml(training.trainer) : '';

    return `
      <div style="margin:0;padding:0;background:#f5f7fb;">
        <div style="max-width:640px;margin:0 auto;padding:24px;">
          <div style="background:#ffffff;border:1px solid #e6e9ef;border-radius:12px;overflow:hidden;">
            <div style="padding:18px 22px;background:#0b5fff;color:#ffffff;">
              <div style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;">
                Training Invitation
              </div>
              <div style="font-family:Arial,sans-serif;font-size:13px;opacity:.9;margin-top:4px;">
                You’re enrolled in a new session
              </div>
            </div>

            <div style="padding:22px;font-family:Arial,sans-serif;color:#111827;line-height:1.6;">
              <p style="margin:0 0 12px 0;">Hello,</p>
              <p style="margin:0 0 16px 0;">
                You have been enrolled in the following training. Please find the details below:
              </p>

              <div style="border:1px solid #eef2f7;border-radius:10px;padding:14px 16px;background:#fafbff;">
                <p style="margin:0 0 8px 0;"><b>Topic:</b> ${topic}</p>
                <p style="margin:0 0 8px 0;"><b>Date:</b> ${date}</p>
                <p style="margin:0 0 8px 0;"><b>Time:</b> ${time}</p>
                ${trainer ? `<p style="margin:0;"><b>Trainer:</b> ${trainer}</p>` : ''}
              </div>

              <p style="margin:16px 0 0 0;">
                Your participation is important. Please join on time.
                If you have any questions, feel free to reply to this email.
              </p>

              <p style="margin:18px 0 0 0;">
                Regards,<br/>
                <b>${this.escapeHtml(this.senderName)}</b>
              </p>
            </div>

            <div style="padding:14px 22px;background:#f9fafb;border-top:1px solid #eef2f7;
                        font-family:Arial,sans-serif;font-size:12px;color:#6b7280;">
              This is an automated message from the Training portal.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  reminderHtml(
    title: string,
    training: { topic: string; date: string; time: string; trainer?: string | null },
    message: string,
  ) {
    const safeTitle = this.escapeHtml(title);
    const safeMsg = this.escapeHtml(message);

    // Reuse the same card style for reminders too
    const topic = this.escapeHtml(training.topic);
    const date = this.escapeHtml(this.formatDate(training.date));
    const time = this.escapeHtml(training.time);
    const trainer = training.trainer ? this.escapeHtml(training.trainer) : '';

    return `
      <div style="margin:0;padding:0;background:#f5f7fb;">
        <div style="max-width:640px;margin:0 auto;padding:24px;">
          <div style="background:#ffffff;border:1px solid #e6e9ef;border-radius:12px;overflow:hidden;">
            <div style="padding:18px 22px;background:#111827;color:#ffffff;">
              <div style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;">
                ${safeTitle}
              </div>
            </div>

            <div style="padding:22px;font-family:Arial,sans-serif;color:#111827;line-height:1.6;">
              <p style="margin:0 0 14px 0;">${safeMsg}</p>

              <div style="border:1px solid #eef2f7;border-radius:10px;padding:14px 16px;background:#fafbff;">
                <p style="margin:0 0 8px 0;"><b>Topic:</b> ${topic}</p>
                <p style="margin:0 0 8px 0;"><b>Date:</b> ${date}</p>
                <p style="margin:0 0 8px 0;"><b>Time:</b> ${time}</p>
                ${trainer ? `<p style="margin:0;"><b>Trainer:</b> ${trainer}</p>` : ''}
              </div>

              <p style="margin:18px 0 0 0;">
                Regards,<br/>
                <b>${this.escapeHtml(this.senderName)}</b>
              </p>
            </div>

            <div style="padding:14px 22px;background:#f9fafb;border-top:1px solid #eef2f7;
                        font-family:Arial,sans-serif;font-size:12px;color:#6b7280;">
              This is an automated message from the Training portal.
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

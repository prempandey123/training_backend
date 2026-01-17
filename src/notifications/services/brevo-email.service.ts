import { Injectable, Logger } from '@nestjs/common';

type BrevoEmailRecipient = { email: string; name?: string };

@Injectable()
export class BrevoEmailService {
  private readonly logger = new Logger(BrevoEmailService.name);

  private readonly IST_TZ_LABEL = 'IST (UTC+05:30)';

  private get apiKey(): string {
    return (process.env.BREVO_API_KEY ?? '').trim();
  }

  private get senderEmail(): string {
    return (process.env.BREVO_FROM_EMAIL ?? '').trim();
  }

  private get senderName(): string {
    return (process.env.BREVO_FROM_NAME ?? 'Training Team').trim();
  }

  /**
   * Formats YYYY-MM-DD into "DD MMM YYYY" (IST-safe).
   * We intentionally avoid JS Date parsing for YYYY-MM-DD to prevent timezone shifts.
   */
  private formatDate(input: string): string {
    const s = (input ?? '').trim();
    const m = s.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
    if (!m) return s || input;
    const yyyy = m[1];
    const mm = Number(m[2]);
    const dd = m[3];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mon = months[mm - 1];
    if (!mon) return s || input;
    return `${dd} ${mon} ${yyyy}`;
  }

  /** Converts "HH:mm" (24h) to "hh:mm AM/PM". If already has AM/PM, normalizes it. */
  private formatTime12(input: string): string {
    const s = (input ?? '').trim();
    if (!s) return '';

    // Already 12h with AM/PM
    const ampm = s.match(/^([0-9]{1,2}):([0-9]{2})\s*([AaPp][Mm])$/);
    if (ampm) {
      const hh = String(Number(ampm[1])).padStart(2, '0');
      const mm = ampm[2];
      const ap = ampm[3].toUpperCase();
      return `${hh}:${mm} ${ap}`;
    }

    // 24h
    const m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!m) return s;

    let h = Number(m[1]);
    const min = m[2];
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const hh = String(h).padStart(2, '0');
    return `${hh}:${min} ${ap}`;
  }

  /** Formats "HH:mm - HH:mm" (or single time) into 12h, and appends IST label. */
  private formatTimeRangeIST(input: string): string {
    const s = (input ?? '').trim();
    if (!s) return '';

    const parts = s.split('-').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const from = this.formatTime12(parts[0]);
      const to = this.formatTime12(parts[1]);
      return `${from} - ${to} (${this.IST_TZ_LABEL})`;
    }

    return `${this.formatTime12(s)} (${this.IST_TZ_LABEL})`;
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
  trainingCreatedHtml(training: { topic: string; venue?: string | null; date: string; time: string; trainer?: string | null }) {
    const topic = this.escapeHtml(training.topic);
    const venue = training.venue ? this.escapeHtml(training.venue) : '';
    const date = this.escapeHtml(this.formatDate(training.date));
    const time = this.escapeHtml(this.formatTimeRangeIST(training.time));
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
                ${venue ? `<p style="margin:0 0 8px 0;"><b>Venue:</b> ${venue}</p>` : ''}
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
    training: { topic: string; venue?: string | null; date: string; time: string; trainer?: string | null },
    message: string,
  ) {
    const safeTitle = this.escapeHtml(title);
    const safeMsg = this.escapeHtml(message);

    // Reuse the same card style for reminders too
    const topic = this.escapeHtml(training.topic);
    const venue = training.venue ? this.escapeHtml(training.venue) : '';
    const date = this.escapeHtml(this.formatDate(training.date));
    const time = this.escapeHtml(this.formatTimeRangeIST(training.time));
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
                ${venue ? `<p style="margin:0 0 8px 0;"><b>Venue:</b> ${venue}</p>` : ''}
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

  trainingPostponedHtml(
    training: {
      topic: string;
      venue?: string | null;
      date: string;
      time: string;
      trainer?: string | null;
      postponeReason?: string | null;
    },
    previous?: { date?: string; time?: string },
  ) {
    const topic = this.escapeHtml(training.topic);
    const venue = training.venue ? this.escapeHtml(training.venue) : '';
    const newDate = this.escapeHtml(this.formatDate(training.date));
    const newTime = this.escapeHtml(this.formatTimeRangeIST(training.time));
    const trainer = training.trainer ? this.escapeHtml(training.trainer) : '';
    const reason = training.postponeReason
      ? this.escapeHtml(training.postponeReason)
      : 'Not specified';

    const oldDate = previous?.date ? this.escapeHtml(this.formatDate(previous.date)) : '';
    const oldTime = previous?.time ? this.escapeHtml(this.formatTimeRangeIST(previous.time)) : '';

    return `
      <div style="margin:0;padding:0;background:#f5f7fb;">
        <div style="max-width:640px;margin:0 auto;padding:24px;">
          <div style="background:#ffffff;border:1px solid #e6e9ef;border-radius:12px;overflow:hidden;">
            <div style="padding:18px 22px;background:#b42318;color:#ffffff;">
              <div style="font-family:Arial,sans-serif;font-size:18px;font-weight:700;">
                Training Postponed
              </div>
              <div style="font-family:Arial,sans-serif;font-size:13px;opacity:.95;margin-top:4px;">
                Updated schedule details below
              </div>
            </div>

            <div style="padding:22px;font-family:Arial,sans-serif;color:#111827;line-height:1.6;">
              <p style="margin:0 0 12px 0;">Hello,</p>
              <p style="margin:0 0 14px 0;">
                The following training session has been postponed.
              </p>

              <div style="border:1px solid #eef2f7;border-radius:10px;padding:14px 16px;background:#fafbff;">
                <p style="margin:0 0 8px 0;"><b>Topic:</b> ${topic}</p>
                ${venue ? `<p style="margin:0 0 8px 0;"><b>Venue:</b> ${venue}</p>` : ''}

                ${oldDate || oldTime ? `
                  <p style="margin:0 0 8px 0;"><b>Previously:</b> ${oldDate}${oldDate && oldTime ? ' | ' : ''}${oldTime}</p>
                ` : ''}

                <p style="margin:0 0 8px 0;"><b>Postponed to:</b> ${newDate} | ${newTime}</p>
                ${trainer ? `<p style="margin:0 0 8px 0;"><b>Trainer:</b> ${trainer}</p>` : ''}
                <p style="margin:0;"><b>Reason:</b> ${reason}</p>
              </div>

              <p style="margin:16px 0 0 0;">
                Please update your calendar accordingly.
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
}

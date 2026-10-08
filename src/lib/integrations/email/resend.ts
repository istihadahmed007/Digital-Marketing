import { safeFetch } from '@/lib/security/ssrf';

export interface EmailSendRecipient {
  contactId: string;
  email: string;
  name?: string;
}

export interface EmailSendOptions {
  fromEmail?: string;
  fromName?: string;
  subject: string;
  htmlContent: string;
  previewText?: string;
  recipients: EmailSendRecipient[];
  campaignId: string;
  workspaceId: string;
  apiKey?: string;
}

export interface SingleSendResult {
  contactId: string;
  email: string;
  success: boolean;
  messageId?: string;
  error?: string;
  status: 'sent' | 'failed';
}

export interface BatchSendResult {
  success: boolean;
  totalAttempted: number;
  sentCount: number;
  failedCount: number;
  results: SingleSendResult[];
  error?: string;
}

export function isValidEmail(email?: string): boolean {
  if (!email) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

/**
 * Resend Email Provider Adapter
 */
export class ResendEmailProvider {
  private apiKey: string;
  private defaultFrom: string;

  constructor(apiKey?: string, defaultFrom?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || '';
    this.defaultFrom = defaultFrom || process.env.RESEND_FROM_EMAIL || 'notifications@resend.dev';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().startsWith('re_'));
  }

  getMissingSetupInstructions(): string {
    return 'Resend email infrastructure is not configured. Missing API Key. Setup required: (1) Set RESEND_API_KEY (starting with re_...) in environment or workspace Integrations, and (2) Set a verified domain sender in RESEND_FROM_EMAIL (e.g. newsletter@yourdomain.com). Test emails can use "onboarding@resend.dev".';
  }

  /**
   * Sends an email batch with idempotency, rate-limit awareness, and per-recipient audit.
   */
  async sendCampaignBatch(options: EmailSendOptions): Promise<BatchSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        totalAttempted: 0,
        sentCount: 0,
        failedCount: 0,
        results: [],
        error: this.getMissingSetupInstructions(),
      };
    }

    const fromAddress = options.fromEmail || this.defaultFrom;
    const results: SingleSendResult[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of options.recipients) {
      if (!isValidEmail(recipient.email)) {
        results.push({
          contactId: recipient.contactId,
          email: recipient.email,
          success: false,
          status: 'failed',
          error: `Invalid email address syntax: "${recipient.email}"`,
        });
        failedCount++;
        continue;
      }

      const idempotencyKey = `cmp_${options.campaignId}_${recipient.contactId}`;

      try {
        const payload = {
          from: fromAddress,
          to: [recipient.email],
          subject: options.subject,
          html: options.htmlContent || '<p></p>',
          headers: {
            'X-Entity-Ref-ID': idempotencyKey,
            'X-Campaign-ID': options.campaignId,
          },
        };

        const res = await safeFetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          timeoutMs: 10000,
        });

        if (res.status === 429) {
          // Rate limited
          results.push({
            contactId: recipient.contactId,
            email: recipient.email,
            success: false,
            status: 'failed',
            error: 'Resend API rate limit exceeded (HTTP 429). Please back off before retrying.',
          });
          failedCount++;
          continue;
        }

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
          results.push({
            contactId: recipient.contactId,
            email: recipient.email,
            success: false,
            status: 'failed',
            error: errBody.message || `Resend rejected send with HTTP ${res.status}`,
          });
          failedCount++;
          continue;
        }

        const data = await res.json();
        const messageId = data?.id || `resend_${Date.now()}`;

        results.push({
          contactId: recipient.contactId,
          email: recipient.email,
          success: true,
          status: 'sent',
          messageId,
        });
        sentCount++;
      } catch (err: any) {
        results.push({
          contactId: recipient.contactId,
          email: recipient.email,
          success: false,
          status: 'failed',
          error: err.message || 'Network error while contacting Resend API',
        });
        failedCount++;
      }

      // Polite delay between outbound sends
      if (options.recipients.length > 1) {
        await new Promise((r) => setTimeout(r, 60));
      }
    }

    return {
      success: sentCount > 0,
      totalAttempted: options.recipients.length,
      sentCount,
      failedCount,
      results,
    };
  }
}

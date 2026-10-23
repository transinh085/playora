import { createTransport } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailTransport {
  sendMail(message: MailMessage): Promise<void>;
}

export interface SentMail extends MailMessage {
  sentAt: Date;
}

export interface TestMailer extends MailTransport {
  outbox: SentMail[];
  clear(): void;
}

export interface SmtpOptions {
  host: string;
  port: number;
  secure?: boolean;
  from: string;
  user?: string;
  pass?: string;
}

let activeTestTransport: MailTransport | null = null;

/** Overrides the default SMTP mailer during tests so emails can be captured in-memory. */
export function setTestMailTransport(transport: MailTransport | null): void {
  activeTestTransport = transport;
}

export function createSmtpTransport(options: SmtpOptions): MailTransport {
  const transporter = createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure ?? false,
    auth:
      options.user && options.pass
        ? {
            user: options.user,
            pass: options.pass,
          }
        : undefined,
  });

  return {
    async sendMail(message: MailMessage) {
      if (activeTestTransport) {
        await activeTestTransport.sendMail(message);
        return;
      }
      try {
        await transporter.sendMail({
          from: options.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });
      } catch (err) {
        console.error('[mailer] Failed to send email via SMTP', {
          to: message.to,
          subject: message.subject,
          host: options.host,
          port: options.port,
          err,
        });
        throw err;
      }
    },
  };
}

export function createTestMailer(): TestMailer {
  const outbox: SentMail[] = [];
  return {
    outbox,
    clear() {
      outbox.length = 0;
    },
    async sendMail(message: MailMessage) {
      outbox.push({ ...message, sentAt: new Date() });
    },
  };
}

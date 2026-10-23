import { createConnection, type Socket } from 'node:net';

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
  from: string;
  user?: string;
  pass?: string;
  /** When true, ECONNREFUSED on local dev SMTP without auth is ignored instead of failing the request. */
  ignoreConnectionRefused?: boolean;
}

function extractEmailAddress(raw: string): string {
  const match = /<([^>]+)>/.exec(raw);
  const address = (match?.[1] ?? raw).trim();
  if (/[\r\n]/.test(address)) throw new Error('Invalid email address');
  return address;
}

function wrapBase64(input: string): string {
  const encoded = Buffer.from(input, 'utf8').toString('base64');
  return encoded.replace(/.{1,76}/g, '$&\r\n').trimEnd();
}

function encodeHeader(value: string): string {
  const clean = value.replace(/[\r\n]+/g, ' ').trim();
  return `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=`;
}

function buildMimeMessage(from: string, message: MailMessage): string {
  const boundary = `playora_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const cleanFrom = from.replace(/[\r\n]+/g, ' ').trim();
  const cleanTo = extractEmailAddress(message.to);
  return [
    `From: ${cleanFrom}`,
    `To: ${cleanTo}`,
    `Subject: ${encodeHeader(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    wrapBase64(message.text),
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    wrapBase64(message.html),
    `--${boundary}--`,
    ``,
  ].join('\r\n');
}

function createSmtpSession(socket: Socket) {
  let buffer = '';
  let currentLines: string[] = [];
  let waiting: ((res: { code: number; message: string }) => void) | null = null;
  let rejectWaiting: ((err: Error) => void) | null = null;
  const queue: Array<{ code: number; message: string }> = [];

  socket.setEncoding('utf8');
  socket.on('data', (chunk: string) => {
    buffer += chunk;
    let idx = buffer.indexOf('\r\n');
    while (idx !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      currentLines.push(line);
      // Final line of an SMTP response has a space (or end of line) after the 3-digit status code.
      if (/^\d{3}(?: |$)/.test(line)) {
        const code = Number.parseInt(line.slice(0, 3), 10);
        const response = { code, message: currentLines.join('\n') };
        currentLines = [];
        if (waiting) {
          const resolve = waiting;
          waiting = null;
          rejectWaiting = null;
          resolve(response);
        } else {
          queue.push(response);
        }
      }
      idx = buffer.indexOf('\r\n');
    }
  });

  socket.on('error', (err) => {
    if (rejectWaiting) {
      const reject = rejectWaiting;
      waiting = null;
      rejectWaiting = null;
      reject(err);
    }
  });

  function readResponse(): Promise<{ code: number; message: string }> {
    const next = queue.shift();
    if (next) return Promise.resolve(next);
    return new Promise((resolve, reject) => {
      waiting = resolve;
      rejectWaiting = reject;
    });
  }

  async function command(line: string, expectedCode: number) {
    socket.write(`${line}\r\n`);
    const res = await readResponse();
    if (res.code !== expectedCode) {
      throw new Error(
        `SMTP error (${line.split(' ')[0]}): expected ${expectedCode}, got ${res.code} ${res.message}`,
      );
    }
  }

  return { readResponse, command };
}

export function createSmtpTransport(options: SmtpOptions): MailTransport {
  const isLocalNoAuth =
    (options.host === 'localhost' || options.host === '127.0.0.1') && !options.user;
  const ignoreRefused = options.ignoreConnectionRefused ?? isLocalNoAuth;

  return {
    async sendMail(message: MailMessage) {
      const fromAddress = extractEmailAddress(options.from);
      const toAddress = extractEmailAddress(message.to);
      const rawData = buildMimeMessage(options.from, message).replace(/^\./gm, '..');

      const socket = await new Promise<Socket | null>((resolve, reject) => {
        const conn = createConnection({ host: options.host, port: options.port });
        conn.once('connect', () => resolve(conn));
        conn.once('error', (err: NodeJS.ErrnoException) => {
          conn.destroy();
          if (ignoreRefused && err.code === 'ECONNREFUSED') {
            resolve(null);
            return;
          }
          reject(err);
        });
      });

      if (!socket) return;

      try {
        const session = createSmtpSession(socket);
        const greeting = await session.readResponse();
        if (greeting.code !== 220) {
          throw new Error(`SMTP greeting failed: ${greeting.code} ${greeting.message}`);
        }
        await session.command('EHLO playora.local', 250);
        if (options.user && options.pass) {
          const token = Buffer.from(`\0${options.user}\0${options.pass}`, 'utf8').toString(
            'base64',
          );
          await session.command(`AUTH PLAIN ${token}`, 235);
        }
        await session.command(`MAIL FROM:<${fromAddress}>`, 250);
        await session.command(`RCPT TO:<${toAddress}>`, 250);
        await session.command('DATA', 354);
        await session.command(`${rawData}\r\n.`, 250);
        await session.command('QUIT', 221).catch(() => undefined);
      } finally {
        socket.destroy();
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

let activeTestTransport: MailTransport | null = null;

/** Overrides the default SMTP mailer during tests so emails can be captured in-memory. */
export function setTestMailTransport(transport: MailTransport | null): void {
  activeTestTransport = transport;
}

export function createEnvMailTransport(): MailTransport {
  const smtp = createSmtpTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number.parseInt(process.env.SMTP_PORT || '1025', 10) || 1025,
    from: process.env.SMTP_FROM || 'Playora <noreply@playora.local>',
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
  });
  return {
    async sendMail(message: MailMessage) {
      if (activeTestTransport) {
        await activeTestTransport.sendMail(message);
        return;
      }
      await smtp.sendMail(message);
    },
  };
}

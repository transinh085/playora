import { describe, expect, test } from 'bun:test';
import { createServer } from 'node:net';
import { detectEmailLocale, renderInvitationEmail, renderMagicLinkEmail } from './email-templates';
import { createSmtpTransport, createTestMailer } from './mailer';

describe('email templates', () => {
  test('renders invitation email in Vietnamese and English (plain + HTML)', () => {
    const vi = renderInvitationEmail(
      {
        organizationName: 'Agency <ABC>',
        inviterName: 'Nguyễn Văn A',
        inviterEmail: 'a@example.com',
        role: 'editor',
        inviteUrl: 'http://localhost:3001/invite/inv_123',
      },
      'vi',
    );
    expect(vi.subject).toContain('Lời mời tham gia Agency <ABC>');
    expect(vi.text).toContain('Biên tập viên');
    expect(vi.text).toContain('http://localhost:3001/invite/inv_123');
    expect(vi.html).toContain('Agency &lt;ABC&gt;');
    expect(vi.html).toContain('Chấp nhận lời mời');
    expect(vi.html).toContain('href="http://localhost:3001/invite/inv_123"');

    const en = renderInvitationEmail(
      {
        organizationName: 'Agency ABC',
        inviterName: 'Alice',
        inviterEmail: 'alice@example.com',
        role: 'admin',
        inviteUrl: 'http://localhost:3001/invite/inv_123',
      },
      'en',
    );
    expect(en.subject).toContain('Invitation to join Agency ABC');
    expect(en.text).toContain('Admin');
    expect(en.html).toContain('Accept invitation');
  });

  test('renders magic link email in Vietnamese and English (plain + HTML)', () => {
    const vi = renderMagicLinkEmail(
      {
        email: 'user@example.com',
        url: 'http://localhost:4000/auth/magic-link/verify?token=abc',
      },
      'vi',
    );
    expect(vi.subject).toContain('Liên kết đăng nhập Playora');
    expect(vi.text).toContain('http://localhost:4000/auth/magic-link/verify?token=abc');
    expect(vi.html).toContain('Đăng nhập Playora');

    const en = renderMagicLinkEmail(
      {
        email: 'user@example.com',
        url: 'http://localhost:4000/auth/magic-link/verify?token=abc',
      },
      'en',
    );
    expect(en.subject).toContain('Sign in to Playora');
    expect(en.html).toContain('Sign in to Playora');
  });

  test('detects locale from playora_locale cookie or Accept-Language', () => {
    expect(detectEmailLocale(new Headers({ cookie: 'playora_locale=en' }))).toBe('en');
    expect(detectEmailLocale(new Headers({ cookie: 'playora_locale=vi' }))).toBe('vi');
    expect(detectEmailLocale(new Headers({ 'accept-language': 'en-US,en;q=0.9' }))).toBe('en');
    expect(detectEmailLocale(new Headers())).toBe('vi');
  });
});

describe('mailer transports', () => {
  test('test mailer records messages in outbox', async () => {
    const mailer = createTestMailer();
    await mailer.sendMail({
      to: 'bob@example.com',
      subject: 'Hello',
      text: 'Plain',
      html: '<p>HTML</p>',
    });
    expect(mailer.outbox).toHaveLength(1);
    expect(mailer.outbox[0]).toMatchObject({ to: 'bob@example.com', subject: 'Hello' });
    mailer.clear();
    expect(mailer.outbox).toHaveLength(0);
  });

  test('SMTP transport speaks RFC 5321 and delivers multipart message', async () => {
    const commands: string[] = [];
    let receivedData = '';

    const server = createServer((socket) => {
      socket.setEncoding('utf8');
      socket.write('220 localhost ESMTP test\r\n');
      let inData = false;
      let buf = '';
      socket.on('data', (chunk: string) => {
        buf += chunk;
        if (!inData) {
          let idx = buf.indexOf('\r\n');
          while (idx !== -1) {
            const cmd = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            commands.push(cmd);
            if (cmd.startsWith('EHLO')) {
              socket.write('250-localhost\r\n250 SIZE 10485760\r\n');
            } else if (cmd.startsWith('MAIL FROM:') || cmd.startsWith('RCPT TO:')) {
              socket.write('250 2.1.0 OK\r\n');
            } else if (cmd === 'DATA') {
              inData = true;
              socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
              break;
            } else if (cmd === 'QUIT') {
              socket.write('221 2.0.0 Bye\r\n');
              socket.end();
            }
            idx = buf.indexOf('\r\n');
          }
        }
        if (inData) {
          const endIdx = buf.indexOf('\r\n.\r\n');
          if (endIdx !== -1) {
            receivedData = buf.slice(0, endIdx);
            buf = buf.slice(endIdx + 5);
            inData = false;
            socket.write('250 2.0.0 Queued\r\n');
          }
        }
      });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    try {
      const transport = createSmtpTransport({
        host: '127.0.0.1',
        port,
        from: 'Playora <noreply@playora.local>',
        ignoreConnectionRefused: false,
      });
      await transport.sendMail({
        to: 'invitee@example.com',
        subject: 'Lời mời Playora',
        text: 'Xin chào từ Playora',
        html: '<p>Xin chào từ Playora</p>',
      });

      expect(commands).toContain('EHLO playora.local');
      expect(commands).toContain('MAIL FROM:<noreply@playora.local>');
      expect(commands).toContain('RCPT TO:<invitee@example.com>');
      expect(receivedData).toContain('Content-Type: multipart/alternative');
      expect(receivedData).toContain(Buffer.from('Xin chào từ Playora', 'utf8').toString('base64'));
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

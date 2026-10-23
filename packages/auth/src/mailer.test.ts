import { describe, expect, test } from 'bun:test';
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

  test('SMTP transport surfaces connection errors instead of swallowing them', async () => {
    const transport = createSmtpTransport({
      host: '127.0.0.1',
      port: 1,
      secure: false,
      from: 'Playora <noreply@playora.local>',
    });
    const originalError = console.error;
    console.error = () => {};
    try {
      await expect(
        transport.sendMail({
          to: 'invitee@example.com',
          subject: 'Test',
          text: 'Hello',
          html: '<p>Hello</p>',
        }),
      ).rejects.toThrow();
    } finally {
      console.error = originalError;
    }
  });
});

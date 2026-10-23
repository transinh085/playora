import type { MailMessage } from './mailer';

export type EmailLocale = 'vi' | 'en';

export interface InvitationEmailParams {
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  inviteUrl: string;
}

export interface MagicLinkEmailParams {
  email: string;
  url: string;
}

const roleLabels: Record<EmailLocale, Record<string, string>> = {
  vi: {
    owner: 'Chủ sở hữu',
    admin: 'Quản trị viên',
    editor: 'Biên tập viên',
    operator: 'Vận hành',
    viewer: 'Người xem',
  },
  en: {
    owner: 'Owner',
    admin: 'Admin',
    editor: 'Editor',
    operator: 'Operator',
    viewer: 'Viewer',
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRole(role: string, locale: EmailLocale): string {
  return role
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => roleLabels[locale][r] ?? r)
    .join(', ');
}

export function detectEmailLocale(headers?: Headers | null): EmailLocale {
  if (!headers) return 'vi';
  const cookie = headers.get('cookie') ?? '';
  const match = /(?:^|;\s*)playora_locale=([^;]+)/.exec(cookie);
  if (match?.[1] === 'en') return 'en';
  if (match?.[1] === 'vi') return 'vi';
  const acceptLanguage = headers.get('accept-language')?.toLowerCase() ?? '';
  if (acceptLanguage.startsWith('en')) return 'en';
  return 'vi';
}

function wrapHtml(title: string, bodyHtml: string): string {
  return [
    '<!doctype html>',
    '<html>',
    `<head><meta charset="utf-8" /><title>${escapeHtml(title)}</title></head>`,
    '<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#111827;background:#f9fafb;">',
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">',
    bodyHtml,
    '</div>',
    '</body>',
    '</html>',
  ].join('');
}

export function renderInvitationEmail(
  params: InvitationEmailParams,
  locale: EmailLocale = 'vi',
): Omit<MailMessage, 'to'> {
  const roleText = formatRole(params.role, locale);
  const org = escapeHtml(params.organizationName);
  const inviter = escapeHtml(params.inviterName || params.inviterEmail);
  const inviterEmail = escapeHtml(params.inviterEmail);
  const roleHtml = escapeHtml(roleText);
  const url = escapeHtml(params.inviteUrl);

  if (locale === 'en') {
    const subject = `Invitation to join ${params.organizationName} on Playora`;
    const text = [
      `Hi,`,
      ``,
      `${params.inviterName || params.inviterEmail} (${params.inviterEmail}) invited you to join "${params.organizationName}" on Playora with the role: ${roleText}.`,
      ``,
      `Accept invitation: ${params.inviteUrl}`,
      ``,
      `If you did not expect this invitation, you can safely ignore this email.`,
    ].join('\n');
    const html = wrapHtml(
      subject,
      [
        `<h2 style="margin:0 0 12px;font-size:20px;">Join ${org} on Playora</h2>`,
        `<p style="margin:0 0 16px;line-height:1.5;"><strong>${inviter}</strong> (${inviterEmail}) invited you to join <strong>${org}</strong> as <strong>${roleHtml}</strong>.</p>`,
        `<p style="margin:0 0 20px;"><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Accept invitation</a></p>`,
        `<p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">Or open this link: <a href="${url}" style="color:#4b5563;">${url}</a></p>`,
      ].join(''),
    );
    return { subject, text, html };
  }

  const subject = `Lời mời tham gia ${params.organizationName} trên Playora`;
  const text = [
    `Xin chào,`,
    ``,
    `${params.inviterName || params.inviterEmail} (${params.inviterEmail}) đã mời bạn tham gia tổ chức "${params.organizationName}" trên Playora với vai trò: ${roleText}.`,
    ``,
    `Chấp nhận lời mời: ${params.inviteUrl}`,
    ``,
    `Nếu bạn không mong đợi lời mời này, vui lòng bỏ qua email này.`,
  ].join('\n');
  const html = wrapHtml(
    subject,
    [
      `<h2 style="margin:0 0 12px;font-size:20px;">Tham gia ${org} trên Playora</h2>`,
      `<p style="margin:0 0 16px;line-height:1.5;"><strong>${inviter}</strong> (${inviterEmail}) đã mời bạn tham gia tổ chức <strong>${org}</strong> với vai trò <strong>${roleHtml}</strong>.</p>`,
      `<p style="margin:0 0 20px;"><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Chấp nhận lời mời</a></p>`,
      `<p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">Hoặc mở liên kết: <a href="${url}" style="color:#4b5563;">${url}</a></p>`,
    ].join(''),
  );
  return { subject, text, html };
}

export function renderMagicLinkEmail(
  params: MagicLinkEmailParams,
  locale: EmailLocale = 'vi',
): Omit<MailMessage, 'to'> {
  const url = escapeHtml(params.url);

  if (locale === 'en') {
    const subject = 'Sign in to Playora';
    const text = [
      `Hi,`,
      ``,
      `Use the link below to sign in to Playora (valid for 5 minutes):`,
      `${params.url}`,
      ``,
      `If you did not request this email, you can safely ignore it.`,
    ].join('\n');
    const html = wrapHtml(
      subject,
      [
        `<h2 style="margin:0 0 12px;font-size:20px;">Sign in to Playora</h2>`,
        `<p style="margin:0 0 16px;line-height:1.5;">Click the button below to sign in. This link is valid for 5 minutes.</p>`,
        `<p style="margin:0 0 20px;"><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Sign in to Playora</a></p>`,
        `<p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">Or open this link: <a href="${url}" style="color:#4b5563;">${url}</a></p>`,
      ].join(''),
    );
    return { subject, text, html };
  }

  const subject = 'Liên kết đăng nhập Playora';
  const text = [
    `Xin chào,`,
    ``,
    `Nhấn vào liên kết dưới đây để đăng nhập Playora (có hiệu lực trong 5 phút):`,
    `${params.url}`,
    ``,
    `Nếu bạn không yêu cầu email này, vui lòng bỏ qua.`,
  ].join('\n');
  const html = wrapHtml(
    subject,
    [
      `<h2 style="margin:0 0 12px;font-size:20px;">Đăng nhập Playora</h2>`,
      `<p style="margin:0 0 16px;line-height:1.5;">Nhấn vào nút bên dưới để đăng nhập. Liên kết có hiệu lực trong 5 phút.</p>`,
      `<p style="margin:0 0 20px;"><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Đăng nhập Playora</a></p>`,
      `<p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">Hoặc mở liên kết: <a href="${url}" style="color:#4b5563;">${url}</a></p>`,
    ].join(''),
  );
  return { subject, text, html };
}

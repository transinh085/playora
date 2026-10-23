import { type Database, schema } from '@playora/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { detectEmailLocale, renderInvitationEmail, renderMagicLinkEmail } from './email-templates';
import { createSmtpTransport, type MailTransport, type SmtpOptions } from './mailer';
import { authOptions, buildPlugins } from './options';

export interface CreateAuthOptions {
  db: Database;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  studioUrl?: string;
  smtp: SmtpOptions;
  mailer?: MailTransport;
  google?: {
    clientId?: string;
    clientSecret?: string;
  };
}

export function createAuth({
  db,
  secret,
  baseURL,
  trustedOrigins,
  studioUrl,
  smtp,
  mailer,
  google,
}: CreateAuthOptions) {
  const studioBaseUrl = (studioUrl ?? trustedOrigins[0] ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );
  const transport = mailer ?? createSmtpTransport(smtp);
  const googleClientId = google?.clientId?.trim();
  const googleClientSecret = google?.clientSecret?.trim();

  return betterAuth({
    ...authOptions,
    secret,
    baseURL,
    trustedOrigins,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    ...(googleClientId && googleClientSecret
      ? {
          socialProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          },
        }
      : {}),
    // TODO(M1-S3): move email sending to BullMQ (packages/jobs)
    plugins: buildPlugins({
      sendInvitationEmail: async (data, request) => {
        const locale = detectEmailLocale(request?.headers);
        const inviteUrl = `${studioBaseUrl}/invite/${data.id}`;
        const rendered = renderInvitationEmail(
          {
            organizationName: data.organization.name,
            inviterName: data.inviter.user.name,
            inviterEmail: data.inviter.user.email,
            role: data.role,
            inviteUrl,
          },
          locale,
        );
        await transport.sendMail({ to: data.email, ...rendered });
      },
      sendMagicLink: async (data, ctx) => {
        const locale = detectEmailLocale(ctx?.request?.headers ?? ctx?.headers);
        const rendered = renderMagicLinkEmail({ email: data.email, url: data.url }, locale);
        await transport.sendMail({ to: data.email, ...rendered });
      },
    }),
  });
}

export type Auth = ReturnType<typeof createAuth>;
export * from './email-templates';
export * from './mailer';
export * from './options';
export * from './permissions';

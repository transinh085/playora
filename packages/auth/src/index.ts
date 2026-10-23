import { type Database, schema } from '@playora/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { organization } from 'better-auth/plugins/organization';
import { detectEmailLocale, renderInvitationEmail, renderMagicLinkEmail } from './email-templates';
import { createEnvMailTransport, type MailTransport } from './mailer';
import { authOptions } from './options';
import { ac, roles } from './permissions';

export interface CreateAuthOptions {
  db: Database;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  studioUrl?: string;
  mailer?: MailTransport;
  google?: {
    clientId: string;
    clientSecret: string;
  };
}

export function createAuth({
  db,
  secret,
  baseURL,
  trustedOrigins,
  studioUrl,
  mailer = createEnvMailTransport(),
  google,
}: CreateAuthOptions) {
  const studioBaseUrl = (studioUrl ?? trustedOrigins[0] ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );
  const googleClientId = google?.clientId ?? process.env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = google?.clientSecret ?? process.env.GOOGLE_CLIENT_SECRET?.trim();

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
    plugins: [
      organization({
        ac,
        roles,
        creatorRole: 'owner',
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
          await mailer.sendMail({ to: data.email, ...rendered });
        },
      }),
      magicLink({
        sendMagicLink: async (data, ctx) => {
          const locale = detectEmailLocale(ctx?.request?.headers ?? ctx?.headers);
          const rendered = renderMagicLinkEmail({ email: data.email, url: data.url }, locale);
          await mailer.sendMail({ to: data.email, ...rendered });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export * from './email-templates';
export * from './mailer';
export * from './permissions';

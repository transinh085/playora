import type { BetterAuthOptions } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { organization } from 'better-auth/plugins/organization';
import { ac, roles } from './permissions';

export interface AuthPluginDeps {
  sendInvitationEmail?: NonNullable<Parameters<typeof organization>[0]>['sendInvitationEmail'];
  sendMagicLink?: Parameters<typeof magicLink>[0]['sendMagicLink'];
}

export function buildPlugins(deps: AuthPluginDeps = {}) {
  return [
    organization({
      ac,
      roles,
      creatorRole: 'owner',
      ...(deps.sendInvitationEmail ? { sendInvitationEmail: deps.sendInvitationEmail } : {}),
    }),
    magicLink({
      // No-op sendMagicLink exists only for schema generation and type inference.
      sendMagicLink: deps.sendMagicLink ?? (async () => {}),
    }),
  ];
}

/** Shared between the runtime instance and the schema generator so both see the same tables. */
export const authOptions = {
  appName: 'Playora',
  basePath: '/auth',
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  plugins: buildPlugins(),
} satisfies BetterAuthOptions;

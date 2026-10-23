import type { BetterAuthOptions } from 'better-auth';
import { organization } from 'better-auth/plugins/organization';

/** Shared between the runtime instance and the schema generator so both see the same tables. */
export const authOptions = {
  appName: 'Playora',
  basePath: '/auth',
  emailAndPassword: { enabled: true },
  plugins: [organization()],
} satisfies BetterAuthOptions;

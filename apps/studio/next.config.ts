import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// One .env at the repo root for every app.
const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  // Docker builds set NEXT_OUTPUT=standalone; trace files from the monorepo root.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  outputFileTracingRoot: resolve(process.cwd(), '../..'),
  transpilePackages: ['@playora/ui', '@playora/contracts', '@playora/api-client', '@playora/i18n'],
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ['antd'],
  },
  env: {
    NEXT_PUBLIC_PLAY_URL:
      process.env.NEXT_PUBLIC_PLAY_URL ?? process.env.PLAY_URL ?? 'http://localhost:3002',
  },
};

export default withNextIntl(config);

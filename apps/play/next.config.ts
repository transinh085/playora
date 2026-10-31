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
  transpilePackages: [
    '@playora/ui',
    '@playora/contracts',
    '@playora/api-client',
    '@playora/core',
    '@playora/game-sdk',
    '@playora/i18n',
    '@playora/templates',
  ],
  experimental: {
    optimizePackageImports: ['@playora/ui', '@playora/contracts', 'lucide-react'],
  },
  env: {
    NEXT_PUBLIC_STUDIO_ORIGINS:
      process.env.NEXT_PUBLIC_STUDIO_ORIGINS ??
      process.env.STUDIO_ORIGINS ??
      'http://localhost:3001',
  },
};

export default withNextIntl(config);

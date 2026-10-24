import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// One .env at the repo root for every app.
const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const config: NextConfig = {
  // Docker builds set NEXT_OUTPUT=standalone; trace files from the monorepo root.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  outputFileTracingRoot: resolve(process.cwd(), '../..'),
  transpilePackages: ['@playora/ui'],
  experimental: {
    optimizePackageImports: ['antd'],
  },
};

export default config;

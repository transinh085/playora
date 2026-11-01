import type { JobName, JobPayload } from '@playora/jobs';
import type { Job } from 'bullmq';
import { processAsset } from './asset-process';
import { processDailyDigest } from './daily-digest';
import { processEventExport } from './event-export';

export type Processors = {
  [N in JobName]: (data: JobPayload<N>, job: Job) => Promise<unknown>;
};

export const processors: Processors = {
  'asset.process': (data) => processAsset(data),
  'event.export': (data) => processEventExport(data),
  'daily.digest': (data) => processDailyDigest(data),
};

import { Logger } from '@nestjs/common';
import type { JobName, JobPayload } from '@playora/jobs';
import type { Job } from 'bullmq';
import { processAsset } from './asset-process';

export type Processor<N extends JobName> = (payload: JobPayload<N>, job: Job) => Promise<unknown>;

const logger = new Logger('Processors');

export { processAsset };

/**
 * One handler per job in @playora/jobs. The type forces a processor for every defined job.
 */
export const processors: { [N in JobName]: Processor<N> } = {
  'asset.process': async (payload) => {
    logger.log(`asset.process ${payload.assetId}`);
    return processAsset(payload);
  },
  'event.export': async (payload) => {
    logger.log(`event.export ${payload.kind} for ${payload.eventId} — not implemented yet`);
  },
};

import { Controller, Get } from '@nestjs/common';
import { LiveMetrics } from '../live/live.metrics';

@Controller('health')
export class HealthController {
  constructor(private readonly metrics: LiveMetrics) {}

  /** `inputs`/`broadcasts` are counts since the previous call. */
  @Get()
  check() {
    return { status: 'ok', uptimeSec: Math.round(process.uptime()), ...this.metrics.snapshot() };
  }
}

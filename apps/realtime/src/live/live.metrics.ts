import { Injectable, type OnModuleDestroy } from '@nestjs/common';

const SAMPLE_MS = 500;

/** Cheap in-process counters for the spike; M1 exports these via OpenTelemetry. */
@Injectable()
export class LiveMetrics implements OnModuleDestroy {
  connections = 0;
  inputs = 0;
  broadcasts = 0;
  /** Worst event-loop delay seen in the last sample window. */
  eventLoopLagMs = 0;

  private last = performance.now();
  private readonly timer = setInterval(() => {
    const now = performance.now();
    this.eventLoopLagMs = Math.max(0, Math.round(now - this.last - SAMPLE_MS));
    this.last = now;
  }, SAMPLE_MS);

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  snapshot() {
    const snap = {
      connections: this.connections,
      inputs: this.inputs,
      broadcasts: this.broadcasts,
      eventLoopLagMs: this.eventLoopLagMs,
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    };
    this.inputs = 0;
    this.broadcasts = 0;
    return snap;
  }
}

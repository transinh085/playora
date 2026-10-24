import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { SocketRole } from '@playora/contracts';

const SAMPLE_MS = 500;

@Injectable()
export class LiveMetrics implements OnModuleDestroy {
  connections = 0;
  rooms = 0;
  socketsByRole: Record<SocketRole, number> = {
    player: 0,
    screen: 0,
    host: 0,
  };
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

  onConnect(role: SocketRole) {
    this.connections++;
    this.socketsByRole[role]++;
  }

  onDisconnect(role: SocketRole) {
    this.connections = Math.max(0, this.connections - 1);
    this.socketsByRole[role] = Math.max(0, this.socketsByRole[role] - 1);
  }

  snapshot() {
    const snap = {
      connections: this.connections,
      rooms: this.rooms,
      socketsByRole: { ...this.socketsByRole },
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

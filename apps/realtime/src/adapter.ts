import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

export class ConfiguredIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origins: string[],
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.origins, credentials: true },
      // Small payloads, many clients: skip per-message compression and keep pings cheap.
      perMessageDeflate: false,
      pingInterval: 20_000,
      pingTimeout: 20_000,
      maxHttpBufferSize: 4 * 1024,
    } as ServerOptions);
  }
}

import { eventsApi } from './events';
import { meApi } from './me';
import { publicApi } from './public';
import type { RouteDef } from './route';

export * from './common';
export * from './events';
export * from './me';
export * from './openapi';
export * from './public';
export * from './route';

/** Every HTTP route, for OpenAPI generation and contract tests. */
export const allRoutes: RouteDef[] = [
  ...Object.values(publicApi),
  ...Object.values(meApi),
  ...Object.values(eventsApi),
];

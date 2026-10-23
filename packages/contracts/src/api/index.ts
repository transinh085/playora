import { assetsApi } from './assets';
import { brandKitsApi } from './brand-kits';
import { eventsApi } from './events';
import { guestsApi } from './guests';
import { meApi } from './me';
import { publicApi } from './public';
import type { RouteDef } from './route';
import { screensApi } from './screens';

export * from './assets';
export * from './brand-kits';
export * from './common';
export * from './events';
export * from './guests';
export * from './me';
export * from './openapi';
export * from './public';
export * from './route';
export * from './screens';

/** Every HTTP route, for OpenAPI generation and contract tests. */
export const allRoutes: RouteDef[] = [
  ...Object.values(publicApi),
  ...Object.values(meApi),
  ...Object.values(eventsApi),
  ...Object.values(assetsApi),
  ...Object.values(brandKitsApi),
  ...Object.values(guestsApi),
  ...Object.values(screensApi),
];

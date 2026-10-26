import { assetsApi } from './assets';
import { adminApi, billingApi } from './billing';
import { brandKitsApi } from './brand-kits';
import { campaignsApi } from './campaigns';
import { eventsApi } from './events';
import { gamesApi } from './games';
import { guestsApi } from './guests';
import { meApi } from './me';
import { playsApi } from './plays';
import { publicApi } from './public';
import type { RouteDef } from './route';
import { templatesApi } from './templates';
import { vouchersApi } from './vouchers';

export * from './assets';
export * from './billing';
export * from './brand-kits';
export * from './campaigns';
export * from './common';
export * from './events';
export * from './games';
export * from './guests';
export * from './me';
export * from './openapi';
export * from './plays';
export * from './public';
export * from './route';
export * from './templates';
export * from './vouchers';

/** Every HTTP route, for OpenAPI generation and contract tests. */
export const allRoutes: RouteDef[] = [
  ...Object.values(publicApi),
  ...Object.values(meApi),
  ...Object.values(eventsApi),
  ...Object.values(assetsApi),
  ...Object.values(brandKitsApi),
  ...Object.values(guestsApi),
  ...Object.values(templatesApi),
  ...Object.values(gamesApi),
  ...Object.values(campaignsApi),
  ...Object.values(playsApi),
  ...Object.values(vouchersApi),
  ...Object.values(billingApi),
  ...Object.values(adminApi),
];

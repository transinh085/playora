import { z } from 'zod';
import { AuthId, Id, IsoDateTime, Ok, OrgParams } from './common';
import { defineRoute } from './route';

/**
 * Counter device QR pairing (docs/adr/017-counter-device-pairing.md, ORG-10, PRZ-17).
 * Owners/admins create a counter device to get a 10-minute one-time pairing code; scanning the QR
 * on a staff phone exchanges the pairing code for a persistent device token scoped strictly to
 * `voucher: ['read', 'redeem']` within that organization.
 */

export const CounterDevice = z.object({
  id: Id,
  organizationId: AuthId,
  label: z.string(),
  storeLabel: z.string().nullable(),
  paired: z.boolean(),
  pairingExpiresAt: IsoDateTime.nullable(),
  lastUsedAt: IsoDateTime.nullable(),
  revokedAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});
export type CounterDevice = z.infer<typeof CounterDevice>;

export const CreateCounterDeviceBody = z.object({
  label: z.string().trim().min(1).max(80),
  storeLabel: z.string().trim().max(120).optional(),
});
export type CreateCounterDeviceBody = z.input<typeof CreateCounterDeviceBody>;

export const CreatedCounterDevice = CounterDevice.extend({
  pairingCode: z.string(),
  pairingExpiresAt: IsoDateTime,
});
export type CreatedCounterDevice = z.infer<typeof CreatedCounterDevice>;

export const PairCounterDeviceBody = z.object({
  pairingCode: z.string().trim().min(8).max(128),
});
export type PairCounterDeviceBody = z.input<typeof PairCounterDeviceBody>;

export const PairedCounterDevice = z.object({
  deviceToken: z.string(),
  device: z.object({
    id: Id,
    organizationId: AuthId,
    organizationName: z.string(),
    label: z.string(),
    storeLabel: z.string().nullable(),
  }),
});
export type PairedCounterDevice = z.infer<typeof PairedCounterDevice>;

const DeviceParams = OrgParams.extend({ deviceId: Id });

export const counterDevicesApi = {
  list: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/counter-devices',
    summary: 'List counter devices for an organization',
    tags: ['vouchers'],
    auth: 'session',
    permission: { member: ['create'] },
    params: OrgParams,
    response: z.object({
      items: z.array(CounterDevice),
      maxDevices: z.number().int(),
    }),
  }),
  create: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/counter-devices',
    summary: 'Create a counter device and issue a 10-minute one-time pairing code',
    tags: ['vouchers'],
    auth: 'session',
    permission: { member: ['create'] },
    params: OrgParams,
    body: CreateCounterDeviceBody,
    response: CreatedCounterDevice,
  }),
  revoke: defineRoute({
    method: 'DELETE',
    path: '/orgs/:orgId/counter-devices/:deviceId',
    summary: 'Revoke a counter device immediately',
    tags: ['vouchers'],
    auth: 'session',
    permission: { member: ['delete'] },
    params: DeviceParams,
    response: Ok,
  }),
  pair: defineRoute({
    method: 'POST',
    path: '/counter-devices/pair',
    summary: 'Exchange a 10-minute one-time pairing code for a persistent counter device token',
    tags: ['vouchers'],
    auth: 'public',
    rateLimit: 'public',
    body: PairCounterDeviceBody,
    response: PairedCounterDevice,
  }),
  me: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/counter-devices/me',
    summary: 'Return the active counter device identity when authenticated with a device token',
    tags: ['vouchers'],
    auth: 'session',
    permission: { voucher: ['read'] },
    params: OrgParams,
    response: z.object({
      device: z
        .object({
          id: Id,
          organizationId: AuthId,
          label: z.string(),
          storeLabel: z.string().nullable(),
        })
        .nullable(),
    }),
  }),
};

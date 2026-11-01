import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type CounterDevice,
  type CreateCounterDeviceBody,
  type CreatedCounterDevice,
  ErrorCode,
  type PairCounterDeviceBody,
  type PairedCounterDevice,
} from '@playora/contracts';
import type { Actor } from '../../common/actor';
import { AuditService } from '../../common/audit/audit.service';
import type { CounterDeviceActor } from '../../common/auth/auth.types';
import { BillingService } from '../billing/billing.service';
import { type CounterDeviceRow, CounterDevicesRepository } from './counter-devices.repository';

const PAIRING_TTL_MS = 10 * 60_000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function toCounterDevice(row: CounterDeviceRow): CounterDevice {
  return {
    id: row.id,
    organizationId: row.organizationId,
    label: row.label,
    storeLabel: row.storeLabel ?? null,
    paired: Boolean(row.tokenHash),
    pairingExpiresAt: row.pairingExpiresAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class CounterDevicesService {
  constructor(
    private readonly repo: CounterDevicesRepository,
    private readonly billing: BillingService,
    private readonly audit: AuditService,
  ) {}

  async list(orgId: string): Promise<{ items: CounterDevice[]; maxDevices: number }> {
    const [rows, maxDevices] = await Promise.all([
      this.repo.listByOrganization(orgId),
      this.billing.maxCounterDevices(orgId),
    ]);
    return {
      items: rows.map(toCounterDevice),
      maxDevices,
    };
  }

  async create(
    orgId: string,
    body: CreateCounterDeviceBody,
    actor: Actor,
  ): Promise<CreatedCounterDevice> {
    const [activeCount, maxDevices] = await Promise.all([
      this.repo.countActiveByOrganization(orgId),
      this.billing.maxCounterDevices(orgId),
    ]);
    if (activeCount >= maxDevices) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Counter device limit reached for current plan',
        details: { maxDevices, activeCount },
      });
    }

    const pairingCode = randomBytes(16).toString('hex');
    const pairingExpiresAt = new Date(Date.now() + PAIRING_TTL_MS);
    const storeLabel = body.storeLabel?.trim() || null;

    const row = await this.repo.create(orgId, {
      label: body.label.trim(),
      storeLabel,
      pairingCodeHash: sha256(pairingCode),
      pairingExpiresAt,
      createdBy: actor.userId,
    });

    await this.audit.record({
      organizationId: orgId,
      actorType: 'user',
      actorId: actor.userId,
      action: 'counter_device.create',
      targetType: 'counter_device',
      targetId: row.id,
      diff: {
        label: row.label,
        storeLabel: row.storeLabel,
      },
      ip: actor.ip,
    });

    return {
      ...toCounterDevice(row),
      pairingCode,
      pairingExpiresAt: pairingExpiresAt.toISOString(),
    };
  }

  async revoke(orgId: string, deviceId: string, actor: Actor): Promise<{ ok: true }> {
    const row = await this.repo.revoke(orgId, deviceId);
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Counter device not found',
      });
    }

    await this.audit.record({
      organizationId: orgId,
      actorType: 'user',
      actorId: actor.userId,
      action: 'counter_device.revoke',
      targetType: 'counter_device',
      targetId: row.id,
      diff: {
        label: row.label,
        storeLabel: row.storeLabel,
      },
      ip: actor.ip,
    });

    return { ok: true };
  }

  async pair(body: PairCounterDeviceBody, ip?: string): Promise<PairedCounterDevice> {
    const pairingCodeHash = sha256(body.pairingCode.trim());
    const deviceToken = randomBytes(32).toString('hex');
    const tokenHash = sha256(deviceToken);

    const paired = await this.repo.exchangePairingCode(pairingCodeHash, tokenHash);
    if (!paired) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Mã ghép nối không hợp lệ hoặc đã hết hạn',
        details: { field: 'pairingCode' },
      });
    }

    await this.audit.record({
      organizationId: paired.organizationId,
      actorType: 'counter_device',
      actorId: paired.id,
      action: 'counter_device.pair',
      targetType: 'counter_device',
      targetId: paired.id,
      diff: {
        label: paired.label,
        storeLabel: paired.storeLabel,
      },
      ip,
    });

    return {
      deviceToken,
      device: paired,
    };
  }

  me(orgId: string, counterDevice: CounterDeviceActor | null) {
    if (!counterDevice || counterDevice.organizationId !== orgId) {
      return { device: null };
    }
    return {
      device: {
        id: counterDevice.id,
        organizationId: counterDevice.organizationId,
        label: counterDevice.label,
        storeLabel: counterDevice.storeLabel,
      },
    };
  }
}

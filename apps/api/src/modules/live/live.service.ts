import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '@playora/contracts';
import { HOST_TICKET_TTL_S, signLiveToken } from '@playora/core/live';
import type { ApiEnv } from '@playora/env';
import { ENV } from '../../infra/tokens';
import { LiveRepository } from './live.repository';

@Injectable()
export class LiveService {
  constructor(
    private readonly repo: LiveRepository,
    @Inject(ENV) private readonly env: ApiEnv,
  ) {}

  async issueHostTicket(orgId: string, eventId: string, userId: string) {
    const event = await this.repo.findEventById(orgId, eventId);
    if (!event) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }
    const exp = Math.floor(Date.now() / 1000) + HOST_TICKET_TTL_S;
    const token = signLiveToken(
      {
        kind: 'host',
        organizationId: orgId,
        eventId,
        sub: userId,
        exp,
      },
      this.env.LIVE_TOKEN_SECRET,
    );
    return {
      token,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }
}

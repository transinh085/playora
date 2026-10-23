import { pgEnum } from 'drizzle-orm/pg-core';

export const eventMode = pgEnum('event_mode', ['live', 'campaign']);
export const eventStatus = pgEnum('event_status', [
  'draft',
  'scheduled',
  'live',
  'ended',
  'archived',
]);
export const identityMode = pgEnum('identity_mode', [
  'anonymous',
  'guest_list',
  'form_only',
  'phone_otp',
  'email_otp',
  'zalo',
]);
export const gameStatus = pgEnum('game_status', ['draft', 'published', 'disabled']);
export const prizeType = pgEnum('prize_type', [
  'physical',
  'voucher_code',
  'e_gift',
  'digital',
  'points',
  'consolation',
  'no_prize',
]);
export const awardStatus = pgEnum('award_status', ['issued', 'notified', 'redeemed', 'void']);
export const roundStatus = pgEnum('round_status', [
  'idle',
  'lobby',
  'countdown',
  'playing',
  'result',
  'closed',
]);
export const dataEnv = pgEnum('data_env', ['live', 'rehearsal']);

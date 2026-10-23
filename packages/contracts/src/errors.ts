export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  SLUG_TAKEN: 'SLUG_TAKEN',
  RATE_LIMITED: 'RATE_LIMITED',
  EVENT_NOT_LIVE: 'EVENT_NOT_LIVE',
  PLAYER_LIMIT_REACHED: 'PLAYER_LIMIT_REACHED',
  PRIZE_OUT_OF_STOCK: 'PRIZE_OUT_OF_STOCK',
  DRAW_POOL_EMPTY: 'DRAW_POOL_EMPTY',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown; requestId?: string };
}

import { describe, expect, test } from 'bun:test';
import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '@playora/contracts';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ slug: z.string().min(3) }));

  test('returns parsed data', () => {
    expect(pipe.transform({ slug: 'demo', extra: 1 })).toEqual({ slug: 'demo' });
  });

  test('throws a VALIDATION_FAILED error body with field details', () => {
    try {
      pipe.transform({ slug: 'x' });
      throw new Error('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse() as {
        code: string;
        details: { fieldErrors: Record<string, string[]> };
      };
      expect(body.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(body.details.fieldErrors.slug).toHaveLength(1);
    }
  });
});

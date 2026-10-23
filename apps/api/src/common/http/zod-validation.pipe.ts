import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { ErrorCode } from '@playora/contracts';
import { type ZodType, z } from 'zod';

/** `@Body(new ZodValidationPipe(schema))` — contracts are zod, so DTO classes are not needed. */
export class ZodValidationPipe<T extends ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Validation failed',
        details: z.flattenError(result.error),
      });
    }
    return result.data;
  }
}

import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { ErrorCode } from '@playora/contracts';
import { map } from 'rxjs';
import { z } from 'zod';
import { getRouteContract } from './route.decorator';

/**
 * Dev/test only: checks every response against its contract so drift fails loudly in tests
 * instead of breaking Studio at runtime. Skipped in production for speed.
 */
@Injectable()
export class ResponseContractInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseContractInterceptor.name);

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const route = getRouteContract(ctx);
    if (!route) return next.handle();
    return next.handle().pipe(
      map((data) => {
        // Serialize first: handlers return Dates, the contract describes the JSON wire format.
        const wire = data === undefined ? undefined : JSON.parse(JSON.stringify(data));
        const result = route.response.safeParse(wire);
        if (!result.success) {
          this.logger.error(
            `Response of ${route.method} ${route.path} violates its contract: ${z.prettifyError(result.error)}`,
          );
          throw new InternalServerErrorException({
            code: ErrorCode.INTERNAL,
            message: 'Response contract violation',
          });
        }
        return data;
      }),
    );
  }
}

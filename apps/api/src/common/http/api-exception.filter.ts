import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type ApiErrorBody, ErrorCode } from '@playora/contracts';
import type { Request, Response } from 'express';

const statusToCode: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
};

/** Every error leaves the API as `{ error: { code, message, details?, requestId } }` (docs/07 §1). */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { id?: string }>();
    const res = http.getResponse<Response>();
    const requestId = req.id ? String(req.id) : undefined;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const error =
        typeof payload === 'object' && payload !== null && 'code' in payload
          ? (payload as ApiErrorBody['error'])
          : { code: statusToCode[status] ?? ErrorCode.INTERNAL, message: exception.message };
      res.status(status).json({ error: { ...error, requestId } } satisfies ApiErrorBody);
      return;
    }

    this.logger.error({ err: exception, requestId }, 'Unhandled error');
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: ErrorCode.INTERNAL, message: 'Internal server error', requestId },
    } satisfies ApiErrorBody);
  }
}

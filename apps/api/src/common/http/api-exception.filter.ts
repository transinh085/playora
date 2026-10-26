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
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
};

/** Every error leaves the API as `{ error: { code, message, details?, requestId } }` (docs/engineering/api.md §1). */
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

    const httpStatus =
      typeof exception === 'object' && exception !== null
        ? 'status' in exception && typeof exception.status === 'number'
          ? exception.status
          : 'statusCode' in exception && typeof exception.statusCode === 'number'
            ? exception.statusCode
            : undefined
        : undefined;
    const mappedCode = httpStatus !== undefined ? statusToCode[httpStatus] : undefined;
    if (httpStatus !== undefined && mappedCode !== undefined) {
      const message =
        exception instanceof Error && exception.message ? exception.message : 'Request failed';
      res.status(httpStatus).json({
        error: { code: mappedCode, message, requestId },
      } satisfies ApiErrorBody);
      return;
    }

    this.logger.error({ err: exception, requestId }, 'Unhandled error');
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: ErrorCode.INTERNAL, message: 'Internal server error', requestId },
    } satisfies ApiErrorBody);
  }
}

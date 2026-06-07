import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthorizationError, DomainError, NotFoundError } from '../errors';

/**
 * Maps domain errors to HTTP responses.
 *
 * Every module's error taxonomy extends the single shared `DomainError`
 * (`src/common/errors`), so this filter recognises any domain error with a
 * plain `instanceof` — no string-name matching. `AuthorizationError` → 403 and
 * `NotFoundError` → 404 are the cross-cutting boundary errors; any other
 * `DomainError` (StateError/InvariantError/ChronologyError/etc.) → 400.
 *
 * The response body matches NestJS's default HttpException JSON shape
 * (`{ statusCode, message, error }`) so the frontend sees consistent errors.
 */
@Catch()
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Let NestJS-native HttpExceptions pass through with their own handling.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response
        .status(status)
        .json(
          typeof body === 'string'
            ? { statusCode: status, message: body }
            : body,
        );
      return;
    }

    const status = this.mapStatus(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      // Not a recognised domain error: rethrow so the default handler logs it.
      throw exception;
    }

    const message =
      exception instanceof Error ? exception.message : 'Bad Request';

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status]
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' '),
    });
  }

  private mapStatus(exception: unknown): HttpStatus {
    if (exception instanceof AuthorizationError) {
      return HttpStatus.FORBIDDEN;
    }
    if (exception instanceof NotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (exception instanceof DomainError) {
      // Any other DomainError (StateError/InvariantError/ChronologyError/etc.)
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

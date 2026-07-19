import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only log 5xx errors or unexpected exceptions to Sentry to prevent noise
    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag('route', request.url);
        scope.setExtra('body', request.body);
        scope.setExtra('query', request.query);
        Sentry.captureException(exception);
      });
    }

    // Rely on base exception filter for actual response handling
    super.catch(exception, host);
  }
}

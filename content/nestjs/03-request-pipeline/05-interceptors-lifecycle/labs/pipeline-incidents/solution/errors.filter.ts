import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const name = HttpStatus[status];
    host.switchToHttp().getResponse<Response>().status(status).json({ statusCode: status, errorCode: name ?? 'ERROR' });
  }
}

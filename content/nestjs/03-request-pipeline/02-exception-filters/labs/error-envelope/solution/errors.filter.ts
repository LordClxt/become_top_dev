import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { OutOfStockError } from './domain.js';

/** L'enveloppe d'erreur unique de l'API. */
export interface ErrorEnvelope {
  statusCode: number;
  errorCode: string;
  message: string;
  path: string;
}

/** Code machine par défaut d'un statut HTTP : 404 → NOT_FOUND. */
function defaultCode(status: number): string {
  const name = HttpStatus[status];
  return typeof name === 'string' ? name : 'ERROR';
}

@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  /** Les erreurs inattendues journalisées (lues par les tests). */
  static logged: string[] = [];

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const ctx = host.switchToHttp();
    const body: ErrorEnvelope = { ...this.describe(exception), path: httpAdapter.getRequestUrl(ctx.getRequest()) };
    httpAdapter.reply(ctx.getResponse(), body, body.statusCode);
  }

  private describe(exception: unknown): Omit<ErrorEnvelope, 'path'> {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const raw = typeof res === 'string' ? res : (res as { message?: unknown }).message;
      const message = Array.isArray(raw) ? raw.join('; ') : String(raw ?? exception.message);
      const errorCode = (typeof res === 'object' && (res as { errorCode?: string }).errorCode) || defaultCode(status);
      return { statusCode: status, errorCode, message };
    }
    if (exception instanceof OutOfStockError) {
      return { statusCode: HttpStatus.CONFLICT, errorCode: 'OUT_OF_STOCK', message: exception.message };
    }
    // Inattendu : on journalise le détail, on ne le renvoie jamais au client.
    ErrorEnvelopeFilter.logged.push(exception instanceof Error ? exception.message : String(exception));
    return { statusCode: 500, errorCode: 'INTERNAL_ERROR', message: 'Erreur interne' };
  }
}

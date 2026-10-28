import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';

/** L'enveloppe d'erreur unique de l'API. */
export interface ErrorEnvelope {
  statusCode: number;
  errorCode: string;
  message: string;
  path: string;
}

@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  /** Les erreurs inattendues journalisées (lues par les tests). */
  static logged: string[] = [];

  catch(_exception: unknown, _host: ArgumentsHost): void {
    throw new Error('TODO');
  }
}

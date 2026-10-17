import { Injectable } from '@nestjs/common';

/** Journal partagé par toutes les instances d'AuditLogger (lu par les tests). */
export const AUDIT_LINES: string[] = [];

/** Identifiant de la requête courante : en-tête x-request-id, ou 'anonymous'. */
@Injectable()
export class RequestContext {
  get requestId(): string {
    throw new Error('TODO: lire l\'en-tête x-request-id de la requête courante');
  }
}

/** Écrit `<Classe consommatrice>: <message>` dans AUDIT_LINES. */
@Injectable()
export class AuditLogger {
  log(message: string): void {
    AUDIT_LINES.push(`?: ${message}`);
  }
}

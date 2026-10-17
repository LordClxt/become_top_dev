import { Inject, Injectable, Scope } from '@nestjs/common';
import { INQUIRER, REQUEST } from '@nestjs/core';
import type { Request } from 'express';

/** Journal partagé par toutes les instances d'AuditLogger (lu par les tests). */
export const AUDIT_LINES: string[] = [];

/** Identifiant de la requête courante : en-tête x-request-id, ou 'anonymous'. */
@Injectable({ scope: Scope.REQUEST })
export class RequestContext {
  constructor(@Inject(REQUEST) private readonly request: Request) {}
  get requestId(): string {
    return this.request.header('x-request-id') ?? 'anonymous';
  }
}

/** Écrit `<Classe consommatrice>: <message>` dans AUDIT_LINES. */
@Injectable({ scope: Scope.TRANSIENT })
export class AuditLogger {
  constructor(@Inject(INQUIRER) private readonly parent: object) {}
  log(message: string): void {
    AUDIT_LINES.push(`${this.parent?.constructor?.name ?? '?'}: ${message}`);
  }
}

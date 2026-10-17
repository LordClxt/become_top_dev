import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

/** Journal d'audit : chaque ligne porte l'identifiant de la requête. */
export const AUDIT: string[] = [];

@Injectable({ scope: Scope.REQUEST })
export class AuditLogger {
  constructor(@Inject(REQUEST) private readonly request: Request) {}
  log(message: string): void {
    AUDIT.push(`[${this.request.header('x-request-id') ?? '-'}] ${message}`);
  }
}

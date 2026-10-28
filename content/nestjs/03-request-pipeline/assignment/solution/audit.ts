import {
  applyDecorators, type CallHandler, type ExecutionContext, HttpException, Injectable, type NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { type Observable, tap } from 'rxjs';
import { RequestContext } from './context.js';

export interface AuditEntry {
  action: string;
  userId: string;
  requestId: string;
  outcome: 'success' | 'failure';
  /** Le statut HTTP de l'échec, si l'erreur en porte un. */
  status?: number;
  durationMs: number;
}

/** Le journal d'audit (en vrai : une table en ajout seul). */
@Injectable()
export class AuditLog {
  readonly entries: AuditEntry[] = [];
}

const AuditAction = Reflector.createDecorator<string>();

/** Enregistre une entrée par appel audité, en cas de succès comme d'échec, sans jamais avaler l'erreur. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly log: AuditLog,
    private readonly ctx: RequestContext,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get(AuditAction, context.getHandler());
    if (!action) return next.handle();
    const userId = context.switchToHttp().getRequest<Request & { user?: { id: string } }>().user?.id ?? 'anonymous';
    const requestId = this.ctx.requestId;
    const start = performance.now();
    const write = (outcome: AuditEntry['outcome'], status?: number) =>
      this.log.entries.push({
        action, userId, requestId, outcome, durationMs: Math.round(performance.now() - start),
        ...(status === undefined ? {} : { status }),
      });
    return next.handle().pipe(tap({
      next: () => write('success'),
      error: (err: unknown) => write('failure', err instanceof HttpException ? err.getStatus() : 500),
    }));
  }
}

/** Rend une route auditée : l'action est une métadonnée, l'intercepteur fait le travail. */
export const Audited = (action: string) => applyDecorators(AuditAction(action), UseInterceptors(AuditInterceptor));

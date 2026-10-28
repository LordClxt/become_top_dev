import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { type Observable, of, tap } from 'rxjs';
import { Clock, Metrics } from './support.js';

/** Durée de cache, en millisecondes, d'une route GET. */
export const CacheTtl = Reflector.createDecorator<number>();

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  constructor(private readonly clock: Clock, private readonly metrics: Metrics) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const start = this.clock.now();
    const record = (outcome: 'ok' | 'error') => {
      const ms = this.clock.now() - start;
      this.metrics.measures.push({ route, outcome, ms });
      return ms;
    };
    return next.handle().pipe(
      // tap({ next }) seul ne serait jamais appelé sur une erreur : on mesure les deux issues.
      tap({
        next: () => http.getResponse<Response>().setHeader('x-response-time-ms', String(record('ok'))),
        error: () => record('error'),
      }),
    );
  }
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly entries = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(private readonly reflector: Reflector, private readonly clock: Clock) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ttl = this.reflector.get(CacheTtl, context.getHandler());
    const req = context.switchToHttp().getRequest<Request>();
    if (!ttl || req.method !== 'GET') return next.handle();
    const key = req.originalUrl;
    const hit = this.entries.get(key);
    if (hit && hit.expiresAt > this.clock.now()) return of(hit.value); // le handler n'est pas appelé
    return next.handle().pipe(
      tap((value) => this.entries.set(key, { value, expiresAt: this.clock.now() + ttl })),
    );
  }
}

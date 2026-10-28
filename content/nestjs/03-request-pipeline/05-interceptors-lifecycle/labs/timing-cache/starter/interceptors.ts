import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';

/** Durée de cache, en millisecondes, d'une route GET. */
export const CacheTtl = (_ms: number): MethodDecorator => () => {};

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, _next: CallHandler): Observable<unknown> {
    throw new Error('TODO');
  }
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, _next: CallHandler): Observable<unknown> {
    throw new Error('TODO');
  }
}

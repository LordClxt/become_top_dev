import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { type Observable, tap } from 'rxjs';

export const MEASURES: { route: string; outcome: 'ok' | 'error' }[] = [];

/** Incident n°3 : tap(fn) n'est jamais appelé quand le handler lève une erreur. */
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    return next.handle().pipe(tap({
      next: () => MEASURES.push({ route, outcome: 'ok' }),
      error: () => MEASURES.push({ route, outcome: 'error' }),
    }));
  }
}

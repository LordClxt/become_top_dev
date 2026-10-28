import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { type Observable, tap } from 'rxjs';

export const MEASURES: { route: string; outcome: 'ok' | 'error' }[] = [];

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    return next.handle().pipe(tap(() => MEASURES.push({ route, outcome: 'ok' })));
  }
}

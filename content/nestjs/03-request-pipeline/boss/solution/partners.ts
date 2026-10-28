import { AsyncLocalStorage } from 'node:async_hooks';
import {
  type ArgumentsHost, type CallHandler, type CanActivate, Catch, createParamDecorator, type ExceptionFilter,
  type ExecutionContext, ForbiddenException, HttpException, HttpStatus, Injectable, type MiddlewareConsumer, Module,
  type NestInterceptor, type NestMiddleware, type NestModule, UnauthorizedException,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, HttpAdapterHost, Reflector } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { map, type Observable } from 'rxjs';
import { type Partner, PARTNERS } from './partners-data.js';

// ---------- métadonnées et décorateurs ----------

/** Toutes les portées exigées, classe ET méthode cumulées. */
export const RequireScopes = (...scopes: string[]) => ScopesMeta(scopes);
const ScopesMeta = Reflector.createDecorator<string[]>();
export const RawResponse = Reflector.createDecorator<boolean>({ transform: () => true });

type PartnerRequest = Request & { partner?: Partner };
export const CurrentPartner = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<PartnerRequest>().partner,
);

// ---------- contexte de requête ----------

@Injectable()
export class Clock {
  now(): number {
    return Date.now();
  }
}

@Injectable()
export class RequestContext {
  private readonly als = new AsyncLocalStorage<{ requestId: string }>();
  run<T>(requestId: string, fn: () => T): T {
    return this.als.run({ requestId }, fn);
  }
  get requestId(): string | undefined {
    return this.als.getStore()?.requestId;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private counter = 0;
  constructor(private readonly ctx: RequestContext) {}
  use(req: Request, res: Response, next: NextFunction): void {
    const id = req.header('x-request-id') ?? `req_${++this.counter}`;
    res.setHeader('x-request-id', id);
    this.ctx.run(id, next);
  }
}

// ---------- erreurs métier lisibles par une machine ----------

class QuotaExceeded extends HttpException {
  constructor(readonly retryAfterS: number) {
    super({ message: 'Quota dépassé', errorCode: 'QUOTA_EXCEEDED' }, HttpStatus.TOO_MANY_REQUESTS);
  }
}

// ---------- guards ----------

/** 1er guard : qui es-tu ? */
@Injectable()
export class PartnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<PartnerRequest>();
    const key = /^Bearer (.+)$/.exec(req.header('authorization') ?? '')?.[1];
    const partner = key ? PARTNERS[key] : undefined;
    if (!partner) throw new UnauthorizedException({ message: 'Clé inconnue', errorCode: 'INVALID_KEY' });
    req.partner = partner;
    return true;
  }
}

/** 2e guard : as-tu le droit ? (portées cumulées classe + méthode) */
@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndMerge(ScopesMeta, [context.getClass(), context.getHandler()]);
    const partner = context.switchToHttp().getRequest<PartnerRequest>().partner!;
    const missing = required.filter((s) => !partner.scopes.includes(s));
    if (missing.length) {
      throw new ForbiddenException({ message: `Portées manquantes : ${missing.join(', ')}`, errorCode: 'MISSING_SCOPE' });
    }
    return true;
  }
}

/** 3e guard : as-tu encore du crédit ? Fenêtre fixe d'une minute par partenaire. */
@Injectable()
export class QuotaGuard implements CanActivate {
  private readonly windows = new Map<string, { start: number; count: number }>();
  constructor(private readonly clock: Clock) {}
  canActivate(context: ExecutionContext): boolean {
    const partner = context.switchToHttp().getRequest<PartnerRequest>().partner!;
    const now = this.clock.now();
    let w = this.windows.get(partner.id);
    if (!w || now - w.start >= 60_000) {
      w = { start: now, count: 0 };
      this.windows.set(partner.id, w);
    }
    if (w.count >= partner.quotaPerMinute) throw new QuotaExceeded(Math.ceil((w.start + 60_000 - now) / 1000));
    w.count++;
    return true;
  }
}

// ---------- réponses ----------

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly ctx: RequestContext) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.reflector.get(RawResponse, context.getHandler())) return next.handle();
    return next.handle().pipe(map((data) => ({ data, meta: { requestId: this.ctx.requestId } })));
  }
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  static logged: string[] = [];
  constructor(private readonly adapterHost: HttpAdapterHost, private readonly ctx: RequestContext) {}
  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const res = host.switchToHttp().getResponse<Response>();
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'Erreur interne';
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      errorCode = (typeof body === 'object' && (body as { errorCode?: string }).errorCode) || String(HttpStatus[statusCode] ?? 'ERROR');
      const raw = typeof body === 'string' ? body : (body as { message?: unknown }).message;
      message = Array.isArray(raw) ? raw.join('; ') : String(raw ?? exception.message);
      if (exception instanceof QuotaExceeded) httpAdapter.setHeader(res, 'retry-after', String(exception.retryAfterS));
    } else {
      ErrorFilter.logged.push(exception instanceof Error ? exception.message : String(exception));
    }
    httpAdapter.reply(res, { statusCode, errorCode, message, requestId: this.ctx.requestId }, statusCode);
  }
}

// ---------- module ----------

@Module({
  providers: [
    Clock, RequestContext,
    // l'ordre d'enregistrement est l'ordre d'exécution
    { provide: APP_GUARD, useClass: PartnerGuard },
    { provide: APP_GUARD, useClass: ScopesGuard },
    { provide: APP_GUARD, useClass: QuotaGuard },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: ErrorFilter },
  ],
})
export class PartnersModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}

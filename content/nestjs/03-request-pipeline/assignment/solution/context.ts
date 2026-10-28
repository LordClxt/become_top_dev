import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export interface RequestStore {
  requestId: string;
}

/**
 * Le contexte de la requête courante, lu n'importe où dans la chaîne d'appels.
 * Il doit rester un SINGLETON : jamais de portée par requête.
 */
@Injectable()
export class RequestContext {
  private readonly als = new AsyncLocalStorage<RequestStore>();

  /** Exécute `fn` dans un nouveau contexte. */
  run<T>(store: RequestStore, fn: () => T): T {
    return this.als.run(store, fn);
  }

  /** L'identifiant de la requête en cours ; lève une erreur hors requête. */
  get requestId(): string {
    const store = this.als.getStore();
    if (!store) throw new Error('RequestContext lu hors d\'une requête');
    return store.requestId;
  }
}

/** Ouvre un contexte par requête : x-request-id reçu, sinon `req_<n>` ; renvoie l'id dans la réponse. */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private counter = 0;
  constructor(private readonly ctx: RequestContext) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.header('x-request-id') ?? `req_${++this.counter}`;
    res.setHeader('x-request-id', requestId);
    this.ctx.run({ requestId }, next);
  }
}

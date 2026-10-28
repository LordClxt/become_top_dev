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
  /** Exécute `fn` dans un nouveau contexte. */
  run<T>(_store: RequestStore, _fn: () => T): T {
    throw new Error('TODO');
  }
  /** L'identifiant de la requête en cours ; lève une erreur hors requête. */
  get requestId(): string {
    throw new Error('TODO');
  }
}

/** Ouvre un contexte par requête : x-request-id reçu, sinon `req_<n>` ; renvoie l'id dans la réponse. */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, _next: NextFunction): void {
    throw new Error('TODO');
  }
}

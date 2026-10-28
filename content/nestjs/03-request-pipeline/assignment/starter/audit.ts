import { Injectable } from '@nestjs/common';

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

/** À écrire : un décorateur de méthode qui rend la route auditée. */
export const Audited = (_action: string): MethodDecorator => () => {};

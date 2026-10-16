/** Levée quand on fusionne deux Recorder aux tranches différentes. */
export class BoundsMismatchError extends Error {
  constructor() {
    super('tranches différentes');
    this.name = 'BoundsMismatchError';
  }
}

/** Mesure les durées des opérations de Tinybase, par nom d'opération, dans des histogrammes. */
export class Recorder {
  readonly #bounds: readonly number[]; // bornes hautes incluses, en millisecondes
  readonly #ops = new Map<string, number[]>();

  // --- Jalon 1 : enregistrer et lire ---

  /** bounds (strictement croissant, en ms) est copié. */
  constructor(bounds: readonly number[]) {
    this.#bounds = bounds; // TODO : est-ce vraiment une copie ?
  }

  /** Enregistre une durée de `ms` millisecondes (tranche : première borne >= ms, sinon débordement). */
  record(op: string, ms: number): void {
    throw new Error('TODO: record');
  }

  /** Nombre de mesures de op (0 si inconnue). */
  count(op: string): number {
    throw new Error('TODO: count');
  }

  /**
   * Borne haute (ms) de la tranche contenant le p-ième percentile de op (rang ceil(p/100 × n)),
   * Infinity si c'est la tranche de débordement, 0 si op n'a aucune mesure.
   */
  quantile(op: string, p: number): number {
    throw new Error('TODO: quantile');
  }

  // --- Jalon 2 : plusieurs nœuds ---

  /** Noms des opérations mesurées, triés. */
  ops(): string[] {
    throw new Error('TODO: ops');
  }

  /**
   * Ajoute les mesures de other (tranche par tranche), y compris les opérations inconnues.
   * other n'est pas modifié. Bornes différentes : BoundsMismatchError, sans rien modifier.
   * (Dans une méthode de Recorder, tu peux lire other.#bounds et other.#ops.)
   */
  merge(other: Recorder): void {
    throw new Error('TODO: merge');
  }

  // --- Jalon 3 : SLO et budget d'erreur ---

  /**
   * Vérifie slo à partir des mesures et du nombre failed de requêtes en échec.
   * Budget d'erreur = floor((1 − availability) × count) − failed ; ajoute 1e-9 avant floor
   * pour absorber l'erreur d'arrondi des flottants.
   */
  evaluate(slo: Slo, failed: number): Verdict {
    throw new Error('TODO: evaluate');
  }
}

/** Objectif sur une opération : le percentile doit rester ≤ maxMs ; availability vaut par exemple 0.999. */
export interface Slo {
  op: string;
  percentile: number;
  maxMs: number;
  availability: number;
}

/** Résultat de la vérification d'un SLO. */
export interface Verdict {
  op: string;
  observedMs: number;      // valeur observée du percentile visé
  latencyMet: boolean;     // observedMs <= maxMs
  budgetRemaining: number; // échecs encore tolérés (négatif si le budget est dépassé)
}

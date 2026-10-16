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

  /** bounds (strictement croissant, en ms) est copié. */
  constructor(bounds: readonly number[]) {
    this.#bounds = [...bounds];
  }

  #counts(op: string): number[] {
    let c = this.#ops.get(op);
    if (!c) {
      c = new Array<number>(this.#bounds.length + 1).fill(0);
      this.#ops.set(op, c);
    }
    return c;
  }

  /** Enregistre une durée de `ms` millisecondes pour l'opération op. */
  record(op: string, ms: number): void {
    const i = this.#bounds.findIndex((b) => ms <= b);
    this.#counts(op)[i === -1 ? this.#bounds.length : i]! += 1;
  }

  /** Nombre de mesures de op (0 si inconnue). */
  count(op: string): number {
    return (this.#ops.get(op) ?? []).reduce((a, b) => a + b, 0);
  }

  /**
   * Borne haute (ms) de la tranche contenant le p-ième percentile de op,
   * Infinity si c'est la tranche de débordement, 0 si op n'a aucune mesure.
   */
  quantile(op: string, p: number): number {
    const total = this.count(op);
    if (total === 0) return 0;
    const rank = Math.min(Math.max(Math.ceil((p / 100) * total), 1), total);
    let seen = 0;
    const counts = this.#ops.get(op)!;
    for (let i = 0; i < counts.length; i++) {
      seen += counts[i]!;
      if (seen >= rank) return i === this.#bounds.length ? Infinity : this.#bounds[i]!;
    }
    return Infinity;
  }

  /** Noms des opérations mesurées, triés. */
  ops(): string[] {
    return [...this.#ops.keys()].sort();
  }

  /**
   * Ajoute les mesures de other (tranche par tranche), y compris les opérations inconnues.
   * other n'est pas modifié. Bornes différentes : BoundsMismatchError, sans rien modifier.
   */
  merge(other: Recorder): void {
    const theirs = other.#bounds;
    if (theirs.length !== this.#bounds.length || theirs.some((b, i) => b !== this.#bounds[i])) {
      throw new BoundsMismatchError();
    }
    for (const [op, counts] of other.#ops) {
      const mine = this.#counts(op);
      counts.forEach((c, i) => { mine[i]! += c; });
    }
  }

  /**
   * Vérifie slo à partir des mesures et du nombre failed de requêtes en échec.
   * Budget d'erreur = floor((1 − availability) × count) − failed (+1e-9 avant floor contre l'arrondi).
   */
  evaluate(slo: Slo, failed: number): Verdict {
    const observedMs = this.quantile(slo.op, slo.percentile);
    const allowed = Math.floor((1 - slo.availability) * this.count(slo.op) + 1e-9);
    return { op: slo.op, observedMs, latencyMet: observedMs <= slo.maxMs, budgetRemaining: allowed - failed };
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

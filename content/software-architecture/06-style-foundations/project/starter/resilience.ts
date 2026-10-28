/**
 * archkit — résilience d'un appel distribué.
 *
 * Le temps et le hasard sont injectés (`Clock`, `random`) : tout est testable sans attendre ni tirer au sort.
 */

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export interface RetryOptions {
  /** Nombre total de tentatives (1 = pas de retry). */
  tries: number;
  /** Plafond du premier délai ; il double à chaque nouvelle tentative. */
  baseMs: number;
  /** Plafond absolu d'un délai. */
  maxMs: number;
  /** Tirage dans [0, 1). */
  random: () => number;
}

/** Jalon 1. Délais avant les tentatives 2, 3… : « full jitter », floor(random × min(maxMs, baseMs × 2^(k−1))). */
export function backoffDelays(opts: RetryOptions): number[] {
  throw new Error('TODO: backoffDelays');
}

/**
 * Jalon 1. Appelle `fn` jusqu'à ce qu'elle réussisse ou que les tentatives soient épuisées, en attendant
 * le délai de backoff entre deux tentatives. Une erreur non retentable (`retryable` renvoie false) est levée tout de suite.
 */
export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions & { clock: Clock; retryable?: (e: unknown) => boolean },
): Promise<T> {
  throw new Error('TODO: retry');
}

export class CircuitOpenError extends Error {
  constructor() { super('circuit ouvert : appel refusé sans être tenté'); this.name = 'CircuitOpenError'; }
}

export type BreakerState = 'closed' | 'open' | 'half-open';

/** Jalon 2. Disjoncteur à trois états. */
export class CircuitBreaker {
  // TODO: l'état dont tu as besoin (échecs consécutifs, instant d'ouverture, essai en cours…)
  private readonly failureThreshold: number;
  private readonly openMs: number;
  private readonly clock: Clock;

  constructor(opts: { failureThreshold: number; openMs: number; clock: Clock }) {
    this.failureThreshold = opts.failureThreshold;
    this.openMs = opts.openMs;
    this.clock = opts.clock;
  }

  state(): BreakerState {
    throw new Error('TODO: state');
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    throw new Error('TODO: call');
  }
}

/** Distribution de latence : latence (ms) → poids (nombre d'observations ou probabilité). */
export type Distribution = Map<number, number>;

/** Jalon 3. Distribution de la somme de latences indépendantes (produit de convolution), normalisée en probabilités. */
export function chain(dists: Distribution[]): Distribution {
  throw new Error('TODO: chain');
}

/** Jalon 3. Plus petite latence L telle que P(latence ≤ L) ≥ q (tolérance de 1e-9 sur les arrondis). */
export function percentileOf(d: Distribution, q: number): number {
  throw new Error('TODO: percentileOf');
}

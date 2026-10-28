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
  const delays: number[] = [];
  for (let k = 1; k < opts.tries; k++) {
    const cap = Math.min(opts.maxMs, opts.baseMs * 2 ** (k - 1));
    delays.push(Math.floor(opts.random() * cap));
  }
  return delays;
}

/**
 * Jalon 1. Appelle `fn` jusqu'à ce qu'elle réussisse ou que les tentatives soient épuisées, en attendant
 * le délai de backoff entre deux tentatives. Une erreur non retentable (`retryable` renvoie false) est levée tout de suite.
 */
export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions & { clock: Clock; retryable?: (e: unknown) => boolean },
): Promise<T> {
  const delays = backoffDelays(opts);
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      const canRetry = attempt < opts.tries && (opts.retryable?.(e) ?? true);
      if (!canRetry) throw e;
      await opts.clock.sleep(delays[attempt - 1]!);
    }
  }
}

export class CircuitOpenError extends Error {
  constructor() { super('circuit ouvert : appel refusé sans être tenté'); this.name = 'CircuitOpenError'; }
}

export type BreakerState = 'closed' | 'open' | 'half-open';

/** Jalon 2. Disjoncteur à trois états. */
export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | undefined;
  private trialInFlight = false;
  private readonly failureThreshold: number;
  private readonly openMs: number;
  private readonly clock: Clock;

  constructor(opts: { failureThreshold: number; openMs: number; clock: Clock }) {
    this.failureThreshold = opts.failureThreshold;
    this.openMs = opts.openMs;
    this.clock = opts.clock;
  }

  state(): BreakerState {
    if (this.openedAt === undefined) return 'closed';
    return this.clock.now() - this.openedAt >= this.openMs ? 'half-open' : 'open';
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    const s = this.state();
    if (s === 'open' || (s === 'half-open' && this.trialInFlight)) throw new CircuitOpenError();
    const trial = s === 'half-open';
    if (trial) this.trialInFlight = true;
    try {
      const result = await fn();
      this.failures = 0;
      this.openedAt = undefined;
      return result;
    } catch (e) {
      this.failures++;
      if (trial || this.failures >= this.failureThreshold) this.openedAt = this.clock.now();
      throw e;
    } finally {
      if (trial) this.trialInFlight = false;
    }
  }
}

/** Distribution de latence : latence (ms) → poids (nombre d'observations ou probabilité). */
export type Distribution = Map<number, number>;

/** Jalon 3. Distribution de la somme de latences indépendantes (produit de convolution), normalisée en probabilités. */
export function chain(dists: Distribution[]): Distribution {
  let acc: Distribution = new Map([[0, 1]]);
  for (const d of dists) {
    const total = [...d.values()].reduce((a, b) => a + b, 0);
    const next: Distribution = new Map();
    for (const [a, pa] of acc) {
      for (const [b, wb] of d) {
        next.set(a + b, (next.get(a + b) ?? 0) + pa * (wb / total));
      }
    }
    acc = next;
  }
  return acc;
}

/** Jalon 3. Plus petite latence L telle que P(latence ≤ L) ≥ q (tolérance de 1e-9 sur les arrondis). */
export function percentileOf(d: Distribution, q: number): number {
  const total = [...d.values()].reduce((a, b) => a + b, 0);
  let cum = 0;
  const keys = [...d.keys()].sort((a, b) => a - b);
  for (const k of keys) {
    cum += d.get(k)! / total;
    if (cum >= q - 1e-9) return k;
  }
  return keys[keys.length - 1] ?? 0;
}

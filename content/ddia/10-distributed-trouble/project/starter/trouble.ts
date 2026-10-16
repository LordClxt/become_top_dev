// ---------- Jalon 1 : détecter une panne avec un délai d'attente ----------

/**
 * Délai d'attente raisonnable d'un système SYNCHRONE fictif : un paquet est livré en au plus d, un nœud vivant traite
 * une requête en au plus r, donc toute réponse arrive en 2d + r.
 */
export function timeoutBound(maxDelay: number, maxProcessing: number): number {
  throw new Error('TODO: timeoutBound');
}

/**
 * Soupçonne un nœud d'être mort quand aucun battement de cœur n'est arrivé depuis plus longtemps que le délai
 * d'attente, calculé sur les intervalles récents : moyenne + k écarts-types, au moins `min`.
 * Les temps sont des entiers en millisecondes, fournis par l'appelant (horloge monotone).
 */
export class FailureDetector {
  readonly #window: number;
  readonly #k: number;
  readonly #min: number;
  #last: number | undefined;
  #intervals: number[] = [];

  constructor(window: number, k: number, minTimeoutMs: number) {
    this.#window = window;
    this.#k = k;
    this.#min = minTimeoutMs;
  }

  /** Enregistre un battement de cœur reçu à l'instant now et retient les `window` derniers intervalles. */
  heartbeat(now: number): void {
    throw new Error('TODO: heartbeat');
  }

  /**
   * Délai d'attente courant : tant qu'on a moins de 2 intervalles, `min` ; ensuite ceil(moyenne + k × écart-type)
   * (écart-type de la population), jamais en dessous de `min`.
   */
  timeout(): number {
    throw new Error('TODO: timeout');
  }

  /** Soupçonné à l'instant now : au moins un battement reçu, et now − dernier > timeout(). */
  suspected(now: number): boolean {
    throw new Error('TODO: suspected');
  }
}

// ---------- Jalon 2 : horloges ----------

/** Horloge logique : elle ordonne les événements causalement, sans mesurer le temps. */
export class Lamport {
  #t = 0;

  /** Avance l'horloge pour un événement local (ou un envoi) et renvoie le nouvel horodatage. */
  tick(): number {
    throw new Error('TODO: tick');
  }

  /** Intègre l'horodatage d'un message reçu : max(local, distant) + 1. */
  receive(remote: number): number {
    throw new Error('TODO: receive');
  }
}

/** Valeur horodatée ; `node` départage deux horodatages égaux. */
export interface LWWValue {
  value: string;
  ts: number;
  node: string;
}

/** L'écriture qui gagne : le plus grand horodatage ; à égalité, le plus grand `node` (ordre des chaînes). */
export function newerLWW(a: LWWValue, b: LWWValue): LWWValue {
  throw new Error('TODO: newerLWW');
}

/** Lecture d'horloge avec incertitude : le temps réel est quelque part dans [earliest, latest]. */
export interface Interval {
  earliest: number;
  latest: number;
}

/** a s'est SÛREMENT produit avant b : les intervalles ne se chevauchent pas (a.latest < b.earliest). */
export function before(a: Interval, b: Interval): boolean {
  throw new Error('TODO: before');
}

/** On ne peut pas ordonner a et b. */
export function overlaps(a: Interval, b: Interval): boolean {
  throw new Error('TODO: overlaps');
}

/** Simule l'API de Spanner : l'heure avec une incertitude ± eps. */
export class TrueTime {
  readonly #now: () => number;
  readonly #eps: number;

  constructor(now: () => number, eps: number) {
    this.#now = now;
    this.#eps = eps;
  }

  /** [maintenant − eps, maintenant + eps]. */
  now(): Interval {
    throw new Error('TODO: now');
  }

  /** ts est sûrement passé : earliest > ts. */
  after(ts: number): boolean {
    throw new Error('TODO: after');
  }
}

/**
 * Attribue à une transaction l'horodatage ts = now().latest, puis attend (sleep(1) à répétition) que ts soit sûrement
 * passé avant de rendre la main. Toute transaction qui démarre ensuite aura un intervalle strictement après ts.
 */
export function commitWait(tt: TrueTime, sleep: (ms: number) => void): number {
  throw new Error('TODO: commitWait');
}

// ---------- Jalon 3 : baux et jetons de clôture ----------

/** Accorde un bail (verrou avec expiration) ; chaque octroi renvoie un jeton de clôture strictement croissant. */
export class LockService {
  readonly #ttl: number;
  #next: number;
  #holder: string | undefined;
  #expires = 0;

  /** Le premier jeton accordé vaut firstToken. */
  constructor(ttlMs: number, firstToken: number) {
    this.#ttl = ttlMs;
    this.#next = firstToken;
  }

  /**
   * Demande le bail à l'instant now. Libre ou expiré (now ≥ expiration) → octroi à client avec un NOUVEAU jeton.
   * Le titulaire courant qui redemande avant l'expiration prolonge son bail et garde le MÊME jeton. Sinon : undefined.
   */
  acquire(client: string, now: number): number | undefined {
    throw new Error('TODO: acquire');
  }

  /** client détient-il encore le bail avec ce jeton à l'instant now ? */
  valid(client: string, token: number, now: number): boolean {
    throw new Error('TODO: valid');
  }
}

/** Un jeton est plus ancien que le plus récent déjà vu. (fournie) */
export class StaleTokenError extends Error {
  constructor(token: number, max: number) { super(`jeton de clôture périmé : ${token} < ${max}`); this.name = 'StaleTokenError'; }
}

/** Protège une ressource : refuse les écritures dont le jeton est inférieur au plus grand déjà vu. */
export class FencedStorage {
  #maxToken = 0;
  #data = '';

  write(token: number, data: string): void {
    throw new Error('TODO: write');
  }

  get data(): string {
    throw new Error('TODO: data');
  }
}

/** Taille d'une majorité stricte parmi n nœuds. */
export function majority(n: number): number {
  throw new Error('TODO: majority');
}

/** Un quorum de votes parmi n nœuds suffit-il à déclarer un nœud mort ? */
export function declaredDead(votes: number, n: number): boolean {
  throw new Error('TODO: declaredDead');
}

/** Vérifie les propriétés de sûreté d'une suite de jetons accordés dans l'ordre : unicité et croissance stricte. */
export function checkFencing(tokens: readonly number[]): void {
  throw new Error('TODO: checkFencing');
}

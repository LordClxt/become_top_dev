export interface Reading {
  city: string;
  country: string;
  tempC: number;
}

const table: Record<string, Reading & { delayMs: number; failures: number }> = {
  Paris: { city: 'Paris', country: 'FR', tempC: 18.4, delayMs: 10, failures: 0 },
  Lyon: { city: 'Lyon', country: 'FR', tempC: 21.1, delayMs: 10, failures: 1 },
  Berlin: { city: 'Berlin', country: 'DE', tempC: 15.2, delayMs: 10, failures: 0 },
  Munich: { city: 'Munich', country: 'DE', tempC: 16.0, delayMs: 300, failures: 0 },
  Oslo: { city: 'Oslo', country: 'NO', tempC: 9.0, delayMs: 10, failures: 5 },
};

/** Faux service : certaines villes sont lentes, d'autres échouent les N premières fois. */
export const weatherService = {
  calls: 0,
  async get(city: string): Promise<Reading> {
    this.calls++;
    const entry = table[city];
    if (!entry) throw new Error(`ville inconnue : ${city}`);
    await new Promise((r) => setTimeout(r, entry.delayMs));
    if (entry.failures > 0) {
      entry.failures--;
      throw new Error(`service indisponible pour ${city}`);
    }
    return { city: entry.city, country: entry.country, tempC: entry.tempC };
  },
};

export function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('délai dépassé')), ms));
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, timeout(ms)]);
}

// TODO 1 : jusqu'à `attempts` essais ; sinon rejette avec la dernière erreur.
export function retry<T>(task: () => Promise<T>, attempts: number): Promise<T> {
  throw new Error('TODO: retry');
}

// TODO 2 : en parallèle, 2 tentatives par ville, délai maximal par ville.
export function loadAll(cities: readonly string[], timeoutMs: number): Promise<{ readings: Reading[]; failed: string[] }> {
  throw new Error('TODO: loadAll');
}

// TODO 3 : pays → moyenne arrondie à 0,1.
export function averageByCountry(readings: readonly Reading[]): Record<string, number> {
  throw new Error('TODO: averageByCountry');
}

// TODO 4 : le plus chaud, sans muter.
export function hottest(readings: readonly Reading[]): Reading | undefined {
  throw new Error('TODO: hottest');
}

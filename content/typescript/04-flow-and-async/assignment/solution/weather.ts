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

export async function retry<T>(task: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: unknown = new Error('aucune tentative');
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await task();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export async function loadAll(cities: readonly string[], timeoutMs: number): Promise<{ readings: Reading[]; failed: string[] }> {
  const results = await Promise.allSettled(
    cities.map((city) => withTimeout(retry(() => weatherService.get(city), 2), timeoutMs)),
  );
  return {
    readings: results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])),
    failed: cities.filter((_, i) => results[i]?.status === 'rejected'),
  };
}

export function averageByCountry(readings: readonly Reading[]): Record<string, number> {
  return Object.fromEntries(
    [...Map.groupBy(readings, (r) => r.country)].map(([country, rs]) => [
      country,
      Math.round((rs.reduce((sum, r) => sum + r.tempC, 0) / rs.length) * 10) / 10,
    ]),
  );
}

export function hottest(readings: readonly Reading[]): Reading | undefined {
  return readings.toSorted((a, b) => b.tempC - a.tempC)[0];
}

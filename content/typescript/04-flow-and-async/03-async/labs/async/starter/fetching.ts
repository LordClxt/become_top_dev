/** Faux serveur : chaque URL répond après un délai ; `calls` compte les requêtes. */
export const server = {
  calls: 0,
  delays: { '/fast': 10, '/slow': 200, '/users': 60, '/posts': 60, '/broken': 10 } as Record<string, number>,
  fetchJSON(url: string): Promise<unknown> {
    this.calls++;
    const delay = this.delays[url] ?? 10;
    return new Promise((resolve, reject) =>
      setTimeout(() => (url === '/broken' ? reject(new Error(`500 ${url}`)) : resolve({ url })), delay),
    );
  },
};

// TODO 1 : les deux requêtes EN PARALLÈLE.
export function fetchBoth(a: string, b: string): Promise<[unknown, unknown]> {
  throw new Error('TODO: fetchBoth');
}

// TODO 2 : rejette avec Error('délai dépassé') après ms.
export function timeout(ms: number) {
  throw new Error('TODO: timeout');
}

// TODO 3 : Promise.race, type de retour Promise<T> sans assertion.
export function withTimeout<T>(promise: Promise<T>, ms: number) {
  throw new Error('TODO: withTimeout');
}

// TODO 4 : toujours une promesse ; une seule requête pour des appels simultanés ; retirée du cache en cas d'échec.
export function fetchWithCache(url: string): Promise<unknown> {
  throw new Error('TODO: fetchWithCache');
}

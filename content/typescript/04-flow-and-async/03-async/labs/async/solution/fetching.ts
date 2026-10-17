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

export function fetchBoth(a: string, b: string): Promise<[unknown, unknown]> {
  return Promise.all([server.fetchJSON(a), server.fetchJSON(b)]);
}

export function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('délai dépassé')), ms));
}

export function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([promise, timeout(ms)]);
}

const pending = new Map<string, Promise<unknown>>();

/** Cache de promesses : les appels simultanés partagent la même requête. */
export function fetchWithCache(url: string): Promise<unknown> {
  const cached = pending.get(url);
  if (cached) return cached;
  const request = server.fetchJSON(url).catch((e: unknown) => {
    pending.delete(url);
    throw e;
  });
  pending.set(url, request);
  return request;
}

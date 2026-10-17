export interface Seed {
  name: string;
  daysToHarvest: number;
}

export interface SeedAPI {
  '/seeds': Seed[];
  '/seed/apple': Seed;
  '/seed/strawberry': Seed;
  '/count': number;
}

const apple: Seed = { name: 'apple', daysToHarvest: 120 };
const strawberry: Seed = { name: 'strawberry', daysToHarvest: 60 };
const responses: Record<string, unknown> = {
  '/seeds': [apple, strawberry],
  '/seed/apple': apple,
  '/seed/strawberry': strawberry,
  '/count': 2,
};

/** Simule le réseau : la réponse n'est pas typée. */
export async function rawFetch(path: string): Promise<unknown> {
  if (!(path in responses)) throw new Error(`404 ${path}`);
  return structuredClone(responses[path]);
}

// TODO 1 : API fixé à la construction, Path inféré à chaque appel de fetch.
export class ApiFetcher<API> {
  constructor(base: string) {
    throw new Error('TODO: ApiFetcher');
  }

  fetch(path: string): Promise<unknown> {
    throw new Error('TODO: fetch');
  }

  history(): string[] {
    throw new Error('TODO: history');
  }
}

// TODO 2 : fetchAPI<API>() renvoie (path) => Promise<API[Path]>.
export function fetchAPI<API>() {
  throw new Error('TODO: fetchAPI');
}

// TODO 3 : en parallèle, dans l'ordre.
export function fetchMany<API, Path extends keyof API & string>(fetcher: ApiFetcher<API>, paths: readonly Path[]): Promise<API[Path][]> {
  throw new Error('TODO: fetchMany');
}

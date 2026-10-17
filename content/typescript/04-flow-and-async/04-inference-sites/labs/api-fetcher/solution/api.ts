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

/** API est fixé à la construction ; Path est inféré à chaque appel de fetch. */
export class ApiFetcher<API> {
  readonly base: string;
  private readonly calls: string[] = [];

  constructor(base: string) {
    this.base = base;
  }

  async fetch<Path extends keyof API & string>(path: Path): Promise<API[Path]> {
    this.calls.push(this.base + path);
    // Assertion justifiée : le serveur respecte le contrat décrit par API (non vérifié ici).
    return (await rawFetch(path)) as API[Path];
  }

  history(): string[] {
    return [...this.calls];
  }
}

/** Curryfication : le premier appel fixe API, la fonction renvoyée infère Path. */
export function fetchAPI<API>() {
  return async <Path extends keyof API & string>(path: Path): Promise<API[Path]> =>
    // Assertion justifiée : même contrat que ApiFetcher.fetch.
    (await rawFetch(path)) as API[Path];
}

export function fetchMany<API, Path extends keyof API & string>(fetcher: ApiFetcher<API>, paths: readonly Path[]): Promise<API[Path][]> {
  return Promise.all(paths.map((path) => fetcher.fetch(path)));
}

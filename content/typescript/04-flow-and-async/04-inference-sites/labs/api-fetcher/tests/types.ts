import type { Equals, Expect } from './expect.ts';
import { ApiFetcher, fetchAPI } from './api.ts';
import type { Seed, SeedAPI } from './api.ts';

const fetcher = new ApiFetcher<SeedAPI>('https://seeds.example');
const fetchSeed = fetchAPI<SeedAPI>();
const p1 = fetcher.fetch('/seed/apple');
const p2 = fetcher.fetch('/seeds');
const p3 = fetchSeed('/count');

export type Checks = [
  Expect<Equals<typeof p1, Promise<Seed>>>,
  Expect<Equals<typeof p2, Promise<Seed[]>>>,
  Expect<Equals<typeof p3, Promise<number>>>,
];

// @ts-expect-error route inconnue
fetcher.fetch('/seed/chicken');
// @ts-expect-error route inconnue
fetchSeed('/seed/chicken');

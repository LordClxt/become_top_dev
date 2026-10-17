import type { Equals, Expect } from './expect.ts';
import type { AppConfig, normalize } from './config.ts';

export type Checks = [
  Expect<Equals<AppConfig, { unitSystem: 'metric' | 'imperial'; darkMode: boolean; decimals: number }>>,
  Expect<Equals<ReturnType<typeof normalize>, AppConfig>>,
];

// @ts-expect-error une configuration normalisée est complète
export const partial: AppConfig = { unitSystem: 'metric' };

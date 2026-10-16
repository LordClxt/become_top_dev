import type { Equals, Expect } from './expect.ts';
import { Temperature, build, getTheme, settings, themeNames } from './spaces.ts';
import type { Settings, TemperatureFactory, TextColor, ThemeName } from './spaces.ts';

export type Checks = [
  Expect<Equals<ThemeName, 'light' | 'dark' | 'solar'>>,
  Expect<Equals<TextColor<'dark'>, '#f5f5f5'>>,
  Expect<Equals<TextColor<'light'>, '#111111'>>,
  Expect<Equals<Settings, { fontSize: number; wrap: boolean; tabs: string[] }>>,
  Expect<Equals<TemperatureFactory, typeof Temperature>>,
  Expect<Equals<ReturnType<typeof themeNames>, ThemeName[]>>,
  Expect<Equals<ReturnType<typeof settings>, Settings>>,
];

// @ts-expect-error 'neon' n'est pas un thème
getTheme('neon');
// @ts-expect-error une instance n'est pas une fabrique (le constructeur)
build(new Temperature(1), 20);

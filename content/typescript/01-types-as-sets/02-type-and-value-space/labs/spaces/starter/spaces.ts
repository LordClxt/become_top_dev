// Les types ci-dessous sont écrits à la main ou valent `never` : déduis-les des valeurs avec typeof / keyof.
const themes = {
  light: { background: '#ffffff', color: '#111111' },
  dark: { background: '#111111', color: '#f5f5f5' },
  solar: { background: '#fdf6e3', color: '#657b83' },
} as const;

// TODO 1 : ThemeName = les clés de `themes` ; tu ne dois pas recopier 'light' | 'dark' | 'solar'.
export type ThemeName = never;

export type Theme = { background: string; color: string };

// TODO 2 : TextColor<N> = le type de la propriété `color` du thème N (accès indexé sur typeof themes).
export type TextColor<N extends ThemeName> = never;

export function getTheme(name: ThemeName): Theme {
  throw new Error('TODO: getTheme');
}

export function themeNames(): ThemeName[] {
  throw new Error('TODO: themeNames');
}

const defaultSettings = { fontSize: 14, wrap: true, tabs: ['js', 'ts'] };

// TODO 3 : Settings est le type de defaultSettings (déduit, pas recopié).
export type Settings = never;

export function settings(overrides: Partial<Settings> = {}): Settings {
  throw new Error('TODO: fusionner defaultSettings et overrides (sans partager le tableau tabs)');
}

export class Temperature {
  celsius: number;
  constructor(celsius: number) {
    this.celsius = celsius;
  }
  get fahrenheit(): number {
    return this.celsius * 9 / 5 + 32;
  }
}

// TODO 4 : TemperatureFactory est le type de la CLASSE (son constructeur), pas celui d'une instance.
export type TemperatureFactory = never;

export function build(factory: TemperatureFactory, celsius: number): Temperature {
  throw new Error('TODO: construire avec la fabrique');
}

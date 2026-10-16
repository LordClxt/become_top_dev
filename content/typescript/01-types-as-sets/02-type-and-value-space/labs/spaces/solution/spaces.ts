const themes = {
  light: { background: '#ffffff', color: '#111111' },
  dark: { background: '#111111', color: '#f5f5f5' },
  solar: { background: '#fdf6e3', color: '#657b83' },
} as const;

/** Les noms de thèmes, déduits de la constante : 'light' | 'dark' | 'solar'. */
export type ThemeName = keyof typeof themes;

/** La forme d'un thème, déduite de la valeur du thème clair. */
export type Theme = { background: string; color: string };

/** Le type de la couleur de texte d'un thème donné (accès indexé). */
export type TextColor<N extends ThemeName> = (typeof themes)[N]['color'];

export function getTheme(name: ThemeName): Theme {
  return themes[name];
}

export function themeNames(): ThemeName[] {
  return Object.keys(themes) as ThemeName[];
}

const defaultSettings = { fontSize: 14, wrap: true, tabs: ['js', 'ts'] };

/** Le type des réglages, déduit de la constante pour ne pas le recopier. */
export type Settings = typeof defaultSettings;

export function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...defaultSettings, tabs: [...defaultSettings.tabs], ...overrides };
}

/** Une classe crée un type (ses instances) ET une valeur (son constructeur). */
export class Temperature {
  celsius: number;
  constructor(celsius: number) {
    this.celsius = celsius;
  }
  get fahrenheit(): number {
    return this.celsius * 9 / 5 + 32;
  }
}

/** Type d'une fabrique de Temperature : le type du CONSTRUCTEUR, pas des instances. */
export type TemperatureFactory = typeof Temperature;

export function build(factory: TemperatureFactory, celsius: number): Temperature {
  return new factory(celsius);
}

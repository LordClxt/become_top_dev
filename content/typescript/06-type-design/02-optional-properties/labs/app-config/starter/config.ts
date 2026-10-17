export type UnitSystem = 'metric' | 'imperial';

export interface InputAppConfig {
  unitSystem?: UnitSystem;
  darkMode?: boolean;
  decimals?: number;
}

// TODO 1 : toutes les propriétés obligatoires, dérivé de InputAppConfig.
export type AppConfig = InputAppConfig;

// TODO 2 : les défauts, appliqués une seule fois.
export const DEFAULTS: AppConfig = {};

export function normalize(input: InputAppConfig): AppConfig {
  throw new Error('TODO: normalize');
}

export interface Hike {
  miles: number;
  hours: number;
}
export const KM_PER_MILE = 1.609344;

// TODO 3 : "3.1 mi à 2.1 mph" ou "5.0 km à 3.3 km/h".
export function formatHike(hike: Hike, config: AppConfig): string {
  throw new Error('TODO: formatHike');
}

// TODO 4 : "impérial, thème clair, 1 décimale(s)".
export function describeConfig(config: AppConfig): string {
  throw new Error('TODO: describeConfig');
}

export type UnitSystem = 'metric' | 'imperial';

export interface InputAppConfig {
  unitSystem?: UnitSystem;
  darkMode?: boolean;
  decimals?: number;
}

/** La configuration normalisée : aucune option manquante. */
export type AppConfig = Required<InputAppConfig>;

export const DEFAULTS: AppConfig = { unitSystem: 'imperial', darkMode: false, decimals: 1 };

export function normalize(input: InputAppConfig): AppConfig {
  return {
    unitSystem: input.unitSystem ?? DEFAULTS.unitSystem,
    darkMode: input.darkMode ?? DEFAULTS.darkMode,
    decimals: input.decimals ?? DEFAULTS.decimals,
  };
}

export interface Hike {
  miles: number;
  hours: number;
}
export const KM_PER_MILE = 1.609344;

export function formatHike(hike: Hike, config: AppConfig): string {
  const metric = config.unitSystem === 'metric';
  const distance = metric ? hike.miles * KM_PER_MILE : hike.miles;
  const fmt = (n: number) => n.toFixed(config.decimals);
  return metric
    ? `${fmt(distance)} km à ${fmt(distance / hike.hours)} km/h`
    : `${fmt(distance)} mi à ${fmt(distance / hike.hours)} mph`;
}

export function describeConfig(config: AppConfig): string {
  const units = config.unitSystem === 'metric' ? 'métrique' : 'impérial';
  const theme = config.darkMode ? 'thème sombre' : 'thème clair';
  return `${units}, ${theme}, ${config.decimals} décimale(s)`;
}

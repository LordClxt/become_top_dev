export interface WindowOptions {
  title: string;
  darkMode?: boolean;
  width?: number;
}

export interface WindowSpec {
  title: string;
  darkMode: boolean;
  width: number;
}

/** Complète les options avec les valeurs par défaut. */
export function createWindow(options: WindowOptions): WindowSpec {
  return { title: options.title, darkMode: options.darkMode ?? false, width: options.width ?? 800 };
}

/** Type faible : toutes les propriétés sont optionnelles. */
export interface ChartOptions {
  logscale?: boolean;
  invertedYAxis?: boolean;
  areaChart?: boolean;
}

export function describeChart(options: ChartOptions): string {
  const flags: string[] = [];
  if (options.logscale) flags.push('logscale');
  if (options.invertedYAxis) flags.push('invertedYAxis');
  if (options.areaChart) flags.push('areaChart');
  return flags.length === 0 ? 'standard' : flags.join('+');
}

/** Accepte volontairement des propriétés inconnues en plus du titre (signature d'index). */
export interface Labelled {
  title: string;
  [extra: string]: unknown;
}

export function titleOf(item: Labelled): string {
  return item.title;
}

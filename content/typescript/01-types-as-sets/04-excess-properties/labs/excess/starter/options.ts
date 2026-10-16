// TODO 1 : déclare et exporte WindowOptions { title: string; darkMode?: boolean; width?: number }
// et WindowSpec (les mêmes champs, tous obligatoires).
export function createWindow(options): unknown {
  throw new Error('TODO: createWindow (darkMode: false et width: 800 par défaut)');
}

// TODO 2 : ChartOptions est un type faible (trois booléens optionnels : logscale, invertedYAxis, areaChart).
export function describeChart(options): string {
  throw new Error('TODO: describeChart — "standard" sans option, sinon les noms des options actives séparés par "+"');
}

// TODO 3 : Labelled exige `title: string` mais ACCEPTE d'autres propriétés (utilise une signature d'index).
export function titleOf(item): string {
  throw new Error('TODO: titleOf');
}

import type { Equals, Expect } from './expect.ts';
import { createWindow, describeChart, titleOf } from './options.ts';
import type { ChartOptions, Labelled, WindowOptions, WindowSpec } from './options.ts';

export type Checks = [
  Expect<Equals<WindowOptions, { title: string; darkMode?: boolean; width?: number }>>,
  Expect<Equals<WindowSpec, { title: string; darkMode: boolean; width: number }>>,
  Expect<Equals<ChartOptions, { logscale?: boolean; invertedYAxis?: boolean; areaChart?: boolean }>>,
  Expect<Equals<ReturnType<typeof createWindow>, WindowSpec>>,
  Expect<Equals<Parameters<typeof describeChart>, [options: ChartOptions]>>,
];

createWindow({ title: 'ok' });
createWindow({ title: 'ok', darkMode: true, width: 100 });
describeChart({});
titleOf({ title: 'x', author: 'y', pages: 3 });

// @ts-expect-error faute de frappe : darkmode n'existe pas dans WindowOptions (littéral frais)
createWindow({ title: 'x', darkmode: true });
// @ts-expect-error title est obligatoire
createWindow({ darkMode: true });
const typo = { logScale: true };
// @ts-expect-error type faible : typo ne partage aucune propriété avec ChartOptions
describeChart(typo);
// @ts-expect-error Labelled exige le titre
titleOf({ author: 'y' });
export type { Labelled };

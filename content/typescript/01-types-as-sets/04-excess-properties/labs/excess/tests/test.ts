import { eq, run, test } from './spec.ts';
import { createWindow, describeChart, titleOf } from './options.ts';

test('createWindow : valeurs par défaut', () => {
  eq(createWindow({ title: 'T' }), { title: 'T', darkMode: false, width: 800 }, "createWindow({ title: 'T' })");
  eq(createWindow({ title: 'T', darkMode: true, width: 100 }), { title: 'T', darkMode: true, width: 100 }, 'createWindow complet');
});

test('describeChart', () => {
  eq(describeChart({}), 'standard', 'describeChart({})');
  eq(describeChart({ logscale: true }), 'logscale', "describeChart({ logscale: true })");
  eq(describeChart({ logscale: true, areaChart: true, invertedYAxis: false }), 'logscale+areaChart', 'deux options actives');
});

test('titleOf accepte les propriétés en plus', () => {
  eq(titleOf({ title: 'Dune', author: 'Herbert', pages: 600 }), 'Dune', 'titleOf avec propriétés en plus');
});

await run();

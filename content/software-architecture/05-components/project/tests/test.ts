import { eq, run, test } from './spec.ts';
import { checkBoundaries, domainGraph, domainOf, domainsInCycles, impact, type Boundaries, type Graph } from './boundaries.ts';

const shop = (): Graph => ({
  'src/catalog/index.ts': ['src/catalog/repo.ts', 'src/shared/index.ts'],
  'src/catalog/repo.ts': ['src/shared/index.ts'],
  'src/ordering/index.ts': ['src/ordering/checkout.ts'],
  'src/ordering/checkout.ts': ['src/catalog/index.ts', 'src/billing/index.ts', 'src/shared/index.ts'],
  'src/billing/index.ts': ['src/billing/invoice.ts'],
  'src/billing/invoice.ts': ['src/shared/index.ts'],
  'src/delivery/index.ts': ['src/ordering/index.ts'],
  'src/shared/index.ts': ['src/shared/db.ts'],
  'src/shared/db.ts': [],
  'src/main.ts': ['src/ordering/index.ts', 'src/delivery/index.ts'],
});
const rules = (): Boundaries => ({
  root: 'src/',
  shared: ['shared'],
  allowed: { ordering: ['catalog', 'billing'], delivery: ['ordering'] },
});

// ---------- Jalon 1 ----------

test('M1 domainOf', () => {
  eq(domainOf('src/ordering/checkout.ts', 'src/'), 'ordering', 'fichier de domaine');
  eq(domainOf('src/ordering/web/form.ts', 'src/'), 'ordering', 'sous-dossier d’un domaine');
  eq(domainOf('src/main.ts', 'src/'), undefined, 'fichier à la racine : hors domaine');
  eq(domainOf('test/x.ts', 'src/'), undefined, 'hors de la racine');
});

test('M1 un monolithe modulaire sain', () => {
  eq(checkBoundaries(shop(), rules()), [], 'violations');
});

test('M1 import profond dans un autre domaine', () => {
  const g = shop();
  g['src/ordering/checkout.ts']!.push('src/billing/invoice.ts');
  eq(checkBoundaries(g, rules()), [{ from: 'src/ordering/checkout.ts', to: 'src/billing/invoice.ts', kind: 'deep-import' }], 'violations');
});

test('M1 dépendance non déclarée', () => {
  const g = shop();
  g['src/billing/invoice.ts']!.push('src/ordering/index.ts', 'src/ordering/index.ts');
  eq(checkBoundaries(g, rules()), [{ from: 'src/billing/invoice.ts', to: 'src/ordering/index.ts', kind: 'undeclared' }], 'violations (un import en double compte une fois)');
});

test('M1 les deux fautes à la fois, et le noyau partagé', () => {
  const g = shop();
  g['src/delivery/index.ts']!.push('src/catalog/repo.ts', 'src/shared/db.ts');
  eq(checkBoundaries(g, rules()), [
    { from: 'src/delivery/index.ts', to: 'src/catalog/repo.ts', kind: 'deep-import' },
    { from: 'src/delivery/index.ts', to: 'src/catalog/repo.ts', kind: 'undeclared' },
    { from: 'src/delivery/index.ts', to: 'src/shared/db.ts', kind: 'deep-import' },
  ], 'violations (shared n’a pas besoin d’être déclaré, mais passe aussi par son index)');
});

// ---------- Jalon 2 ----------

test('M2 graphe des domaines', () => {
  eq(domainGraph(shop(), 'src/'), {
    billing: ['shared'],
    catalog: ['shared'],
    delivery: ['ordering'],
    ordering: ['billing', 'catalog', 'shared'],
    shared: [],
  }, 'graphe (main.ts, hors domaine, est ignoré)');
});

test('M2 domaines pris dans un cycle', () => {
  eq(domainsInCycles(shop(), 'src/'), [], 'aucun cycle');
  const g = shop();
  g['src/billing/invoice.ts']!.push('src/delivery/index.ts');
  eq(domainsInCycles(g, 'src/'), ['billing', 'delivery', 'ordering'], 'billing → delivery → ordering → billing');
});

// ---------- Jalon 3 ----------

test('M3 impact d’un changement', () => {
  eq(impact(shop(), ['src/billing/invoice.ts'], 'src/'), ['billing', 'delivery', 'ordering'], 'billing modifié : ordering en dépend, delivery dépend d’ordering');
  eq(impact(shop(), ['src/delivery/index.ts'], 'src/'), ['delivery'], 'personne ne dépend de delivery');
  eq(impact(shop(), ['src/shared/db.ts'], 'src/'), ['billing', 'catalog', 'delivery', 'ordering', 'shared'], 'le noyau partagé touche tout');
});

test('M3 plusieurs fichiers, fichiers hors domaine, cycles', () => {
  eq(impact(shop(), ['src/catalog/repo.ts', 'src/main.ts', 'README.md'], 'src/'), ['catalog', 'delivery', 'ordering'], 'impact');
  const g = shop();
  g['src/billing/invoice.ts']!.push('src/delivery/index.ts');
  eq(impact(g, ['src/delivery/index.ts'], 'src/'), ['billing', 'delivery', 'ordering'], 'un cycle ne fait pas boucler l’analyse');
});

await run();

import { check, eq, run, test } from './spec.ts';
import { couplingMetrics, lcom, packageOf, type SourceFile } from './coupling.ts';

const f = (path: string, imports: string[] = [], abstractTypes = 0, concreteTypes = 1): SourceFile =>
  ({ path, imports, abstractTypes, concreteTypes });

// La boutique de la leçon, éclatée en fichiers.
const shop = (): SourceFile[] => [
  f('src/api/routes.ts', ['src/orders/service.ts', 'src/catalog/index.ts', 'src/money/money.ts', 'node_modules/express/index.js'], 0, 4),
  f('src/admin/panel.ts', ['src/orders/service.ts', 'src/money/money.ts'], 0, 3),
  f('src/orders/service.ts', ['src/money/money.ts', 'src/db/port.ts', 'src/catalog/index.ts', 'src/orders/model.ts'], 0, 3),
  f('src/orders/model.ts', ['src/money/money.ts'], 0, 2),
  f('src/catalog/index.ts', ['src/money/money.ts', 'src/db/port.ts', 'src/catalog/repo.ts'], 2, 1),
  f('src/catalog/repo.ts', ['src/db/port.ts'], 0, 1),
  f('src/money/money.ts', [], 0, 6),
  f('src/db/port.ts', [], 3, 0),
];
const byName = (files: SourceFile[], threshold?: number) =>
  Object.fromEntries(couplingMetrics(files, threshold).map((m) => [m.name, m]));

// ---------- Jalon 1 ----------

test('M1 packageOf', () => {
  eq(packageOf('src/orders/service.ts'), 'src/orders', "packageOf('src/orders/service.ts')");
  eq(packageOf('main.ts'), '.', "packageOf('main.ts') (fichier à la racine)");
});

test('M1 Ca et Ce entre packages distincts', () => {
  const m = byName(shop());
  eq(Object.keys(m), ['src/admin', 'src/api', 'src/catalog', 'src/db', 'src/money', 'src/orders'], 'packages, triés par nom');
  eq([m['src/orders']!.ca, m['src/orders']!.ce], [2, 3], 'orders : [Ca, Ce] (un import interne au package ne compte pas)');
  eq([m['src/money']!.ca, m['src/money']!.ce], [4, 0], 'money : [Ca, Ce] (plusieurs fichiers d’un package qui importent money comptent pour un)');
  eq([m['src/api']!.ca, m['src/api']!.ce], [0, 3], 'api : [Ca, Ce] (express, hors du code analysé, est ignoré)');
  eq([m['src/db']!.ca, m['src/db']!.ce], [2, 0], 'db : [Ca, Ce]');
});

test('M1 instabilité', () => {
  const m = byName(shop());
  eq(m['src/orders']!.instability, 0.6, 'I(orders)');
  eq(m['src/catalog']!.instability, 0.5, 'I(catalog)');
  eq(m['src/money']!.instability, 0, 'I(money)');
  eq(m['src/api']!.instability, 1, 'I(api)');
  eq(byName([f('lonely/a.ts')])['lonely']!.instability, 0, 'un package isolé a une instabilité de 0 par convention');
});

// ---------- Jalon 2 ----------

test('M2 abstraction et distance', () => {
  const m = byName(shop());
  eq(m['src/catalog']!.abstractness, 0.5, 'A(catalog) = 2 abstraits sur 4 éléments (fichiers additionnés)');
  eq(m['src/catalog']!.distance, 0, 'D(catalog)');
  eq(m['src/orders']!.distance, 0.4, 'D(orders)');
  eq(m['src/money']!.distance, 1, 'D(money)');
  eq(m['src/db']!.abstractness, 1, 'A(db)');
  eq(m['src/db']!.distance, 0, 'D(db) : stable et abstrait, pile sur la séquence principale');
  eq(byName([f('empty/a.ts', [], 0, 0)])['empty']!.abstractness, 0, 'A d’un package sans élément : 0');
});

test('M2 arrondi à trois décimales', () => {
  const files = [f('a/x.ts', ['b/y.ts', 'c/z.ts']), f('b/y.ts'), f('c/z.ts'), f('d/w.ts', ['a/x.ts'], 1, 2)];
  const m = byName(files);
  eq(m['a']!.instability, 0.667, 'I(a) = 2/3 arrondi');
  eq(m['d']!.abstractness, 0.333, 'A(d) = 1/3 arrondi');
});

test('M2 zones', () => {
  const m = byName(shop());
  eq(m['src/money']!.zone, 'pain', 'money (concret, très utilisé)');
  eq(m['src/catalog']!.zone, 'main-sequence', 'catalog');
  eq(m['src/orders']!.zone, 'main-sequence', 'orders (D = 0,4 sous le seuil par défaut de 0,5)');
  const ext = byName([...shop(), f('src/extensions/api.ts', ['src/money/money.ts'], 6, 0)]);
  eq(ext['src/extensions']!.zone, 'uselessness', 'extensions (abstrait, personne ne l’importe)');
  eq(byName(shop(), 0.3)['src/orders']!.zone, 'pain', 'orders avec un seuil de 0,3');
});

// ---------- Jalon 3 ----------

test('M3 LCOM de la classe Checkout', () => {
  const r = lcom({ add: ['cart'], total: ['cart', 'discount'], applyCode: ['discount'], sendReceipt: ['smtp'] });
  eq(r.score, 2, 'score');
  eq(r.groups, [['add', 'applyCode', 'total'], ['sendReceipt']], 'groupes, triés');
});

test('M3 liens de proche en proche et méthodes sans champ', () => {
  const r = lcom({ a: ['x'], b: ['y'], c: ['x', 'z'], d: ['z', 'y'], e: [], f: ['w'] });
  eq(r.groups, [['a', 'b', 'c', 'd'], ['e'], ['f']], 'a–c par x, c–d par z, d–b par y ; e sans champ forme son groupe');
  eq(lcom({}).score, 0, 'une classe sans méthode');
});

test('M3 une grande classe utilitaire', () => {
  const uses: Record<string, string[]> = {};
  for (let i = 0; i < 2000; i++) uses[`m${String(i).padStart(4, '0')}`] = [`f${i % 50}`];
  const t = performance.now();
  const r = lcom(uses);
  eq(r.score, 50, 'score (2000 méthodes sur 50 champs)');
  check(performance.now() - t < 500, 'lcom doit rester rapide sur 2000 méthodes (union-find plutôt que comparer toutes les paires)');
});

await run();

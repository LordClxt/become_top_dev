import { check, eq, raises, run, test } from './spec.ts';
import { and, bitmap, decode, encode, or, runs, Table } from './colstore.ts';

function sales(): Table {
  const t = new Table('day', 'product', 'store', 'qty');
  for (const r of [
    ['2', 'B', 's1', '4'], ['1', 'A', 's2', '3'], ['2', 'A', 's1', '5'], ['1', 'B', 's1', '7'],
    ['1', 'A', 's1', '2'], ['2', 'B', 's2', '6'], ['1', 'B', 's2', '1'], ['2', 'A', 's2', '8'],
  ]) t.append(...r);
  return t;
}

// ---------- Jalon 1 ----------

test('M1 colonnes et lignes', () => {
  const t = sales();
  eq(t.length, 8, 'length');
  eq(t.column('product'), ['B', 'A', 'A', 'B', 'A', 'B', 'B', 'A'], "column('product') — chaque colonne garde l’ordre d’insertion");
  eq(t.row(3), ['1', 'B', 's1', '7'], 'row(3) — la 4ᵉ valeur de CHAQUE colonne, dans l’ordre des colonnes');
  eq([t.row(8), t.row(-1)], [undefined, undefined], 'row hors limites');
  eq(t.column('nope'), undefined, 'column d’une colonne inconnue');
});

test('M1 append vérifie le nombre de valeurs', async () => {
  const t = new Table('a', 'b');
  await raises(() => t.append('1'), 'append d’une ligne trop courte', RangeError);
  await raises(() => t.append('1', '2', '3'), 'append d’une ligne trop longue', RangeError);
  eq(t.length, 0, 'length après deux ajouts refusés — n’ajoute rien à moitié');
  t.append('1', '2');
  eq(t.length, 1, 'length après un append valide');
});

test('M1 column renvoie une copie', () => {
  const t = sales();
  t.column('day')![0] = '999';
  eq(t.column('day')![0], '2', 'column doit renvoyer une copie : modifier le résultat ne doit pas toucher la table');
});

// ---------- Jalon 2 ----------

test('M2 bitmap, ou, et', () => {
  const prod = ['29', '29', '69', '69', '69', '69', '29', '31', '31'];
  const store = ['3', '3', '3', '5', '5', '3', '3', '5', '3'];
  const b29 = bitmap(prod, '29');
  eq(b29, [true, true, false, false, false, false, true, false, false], "bitmap(prod, '29')");
  eq(or(b29, bitmap(prod, '31')), [true, true, false, false, false, false, true, true, true], 'OU');
  eq(and(b29, bitmap(store, '3')), [true, true, false, false, false, false, true, false, false], 'ET');
  eq([and(b29, b29.slice(0, 3)), or(b29, b29.slice(0, 3))], [undefined, undefined], 'longueurs différentes');
});

test('M2 encode et decode', () => {
  const cases: [string, number[]][] = [
    ['110000100', [0, 2, 4, 1, 2]], ['001111000', [2, 4, 3]], ['0000', [4]], ['1111', [0, 4]],
    ['', []], ['1', [0, 1]], ['010', [1, 1, 1]],
  ];
  for (const [s, r] of cases) {
    const bits = [...s].map((c) => c === '1');
    eq(encode(bits), r, `encode("${s}") — commence toujours par une séquence de zéros (peut valoir 0)`);
    eq(decode(r), bits, `decode(${JSON.stringify(r)})`);
  }
});

test('M2 aller-retour sur 1000 bits', () => {
  const bits = Array.from({ length: 1000 }, (_, i) => Math.floor(i / 37) % 3 === 0);
  eq(decode(encode(bits)), bits, 'decode(encode(x)) doit redonner x');
});

// ---------- Jalon 3 ----------

test('M3 sortBy garde les lignes entières', () => {
  const t = sales();
  t.sortBy('day', 'product');
  eq(t.column('day'), ['1', '1', '1', '1', '2', '2', '2', '2'], 'day trié');
  eq(t.column('product'), ['A', 'A', 'B', 'B', 'A', 'A', 'B', 'B'], 'product trié');
  const rows = Array.from({ length: t.length }, (_, i) => t.row(i)!.join(','));
  check(rows.includes('1,A,s2,3'), 'après le tri, la ligne (1, A, s2, 3) a été défaite : on trie des lignes ENTIÈRES, jamais chaque colonne à part');
  eq([t.row(0)![3], t.row(1)![3]], ['3', '2'], 'le tri doit être stable : (1,A,s2,3) était avant (1,A,s1,2)');
});

test('M3 colonne inconnue : table intacte', async () => {
  const t = sales();
  const before = t.column('day');
  await raises(() => t.sortBy('day', 'nope'), 'sortBy sur une colonne inconnue');
  eq(t.column('day'), before, 'la table ne doit pas être modifiée quand le tri échoue');
});

test('M3 les séquences dépendent de l’ordre de tri', () => {
  const t = sales();
  eq(runs(t.column('day')!), 7, 'ordre d’insertion : runs(day)');
  t.sortBy('day', 'product');
  eq([runs(t.column('day')!), runs(t.column('product')!)], [2, 4], 'tri (day, product) : runs — seule la première clé se compresse fortement');
  t.sortBy('product', 'day');
  eq([runs(t.column('day')!), runs(t.column('product')!)], [4, 2], 'tri (product, day) : runs');
  eq(runs([]), 0, 'runs([])');
});

test('M3 sumWhere', async () => {
  const t = sales();
  const cases: [Record<string, string> | undefined, number][] = [
    [undefined, 36], [{ product: 'A' }, 18], [{ product: 'A', day: '1' }, 5],
    [{ product: 'B', store: 's1', day: '2' }, 4], [{ product: 'Z' }, 0],
  ];
  for (const [filters, want] of cases) eq(t.sumWhere('qty', filters), want, `sumWhere('qty', ${JSON.stringify(filters)})`);
  await raises(() => t.sumWhere('nope'), 'mesure inconnue');
  await raises(() => t.sumWhere('qty', { nope: 'x' }), 'filtre sur une colonne inconnue');
  await raises(() => t.sumWhere('product'), 'mesure non entière');
});

test('M3 sumWhere après un tri', () => {
  const t = sales();
  t.sortBy('product', 'store');
  eq(t.sumWhere('qty', { product: 'B', day: '1' }), 8, 'sumWhere après tri (7 + 1)');
});

await run();

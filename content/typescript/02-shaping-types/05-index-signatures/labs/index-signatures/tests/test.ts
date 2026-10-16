import { eq, raises, run, test } from './spec.ts';
import { addVec, first, parseCSV, sumAll, toRocket } from './csv.ts';

const CSV = `
name, variant, thrust
Falcon 9, v1.0, 4940

Saturn V, SA-501, 35100
`;

test('parseCSV : une Map par ligne, vides ignorées, espaces retirés', () => {
  const rows = parseCSV(CSV);
  eq(rows.length, 2, 'nombre de lignes');
  eq(rows[0]!.get('name'), 'Falcon 9', 'rows[0].name');
  eq(rows[1]!.get('thrust'), '35100', 'rows[1].thrust');
  eq(rows[0]!.get('absente'), undefined, 'colonne absente');
});

test('parseCSV : en-têtes seuls, entrée vide, colonnes incohérentes', async () => {
  eq(parseCSV('a,b'), [], 'en-têtes seuls');
  eq(parseCSV(''), [], 'entrée vide');
  await raises(() => parseCSV('a,b\n1,2,3'), 'ligne trop longue', RangeError);
});

test('toRocket', async () => {
  const [falcon] = parseCSV(CSV);
  eq(toRocket(falcon!), { name: 'Falcon 9', variant: 'v1.0', thrustKn: 4940 }, 'toRocket(falcon)');
  await raises(() => toRocket(new Map([['name', 'x']])), 'colonnes manquantes', TypeError);
  await raises(() => toRocket(new Map([['name', 'x'], ['variant', 'y'], ['thrust', 'beaucoup']])), 'poussée invalide', TypeError);
});

test('addVec', () => {
  eq(addVec({ x: 1, y: 2, z: 3 }, { x: 10, y: 20, z: 30 }), { x: 11, y: 22, z: 33 }, 'addVec');
});

test('sumAll : tableau, Set, générateur', () => {
  eq(sumAll([1, 2, 3]), 6, 'tableau');
  eq(sumAll(new Set([1, 2, 3])), 6, 'Set');
  eq(sumAll((function* () { yield 4; yield 5; })()), 9, 'générateur');
  eq(sumAll([]), 0, 'vide');
});

test('first : tableau, chaîne, vide', () => {
  eq(first([7, 8]), 7, 'first([7, 8])');
  eq(first('abc'), 'a', "first('abc')");
  eq(first([]), undefined, 'first([])');
});

await run();

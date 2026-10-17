import { eq, raises, run, test } from './spec.ts';
import { cacheLast, fetchPeak, shallowObjectEqual } from './peaks.ts';

test('fetchPeak', async () => {
  const peak = await fetchPeak('everest');
  eq(peak.elevationMeters, 8849, 'altitude');
  eq((await raises(() => fetchPeak('broken'), 'sans name')).message, 'réponse invalide', 'message');
  await raises(() => fetchPeak('nope'), 'null');
});

test('shallowObjectEqual', () => {
  const inner = { z: 1 };
  eq(shallowObjectEqual({ a: 1, b: inner }, { b: inner, a: 1 }), true, 'égaux');
  eq(shallowObjectEqual({ a: 1 }, { a: 1, b: 2 }), false, 'clé en plus');
  eq(shallowObjectEqual({ a: { z: 1 } }, { a: { z: 1 } }), false, 'objets distincts');
  eq(shallowObjectEqual({ a: undefined }, { b: undefined }), false, 'clés différentes');
});

test('cacheLast', () => {
  let calls = 0;
  const add = cacheLast((a: number, b: number) => { calls++; return a + b; });
  eq(add(1, 2), 3, 'add(1, 2)');
  eq(add(1, 2), 3, 'add(1, 2) en cache');
  eq(calls, 1, 'un seul appel');
  eq(add(2, 2), 4, 'add(2, 2)');
  eq(add(1, 2), 3, 'add(1, 2) recalculé');
  eq(calls, 3, 'seul le dernier appel est mémorisé');
});

await run();

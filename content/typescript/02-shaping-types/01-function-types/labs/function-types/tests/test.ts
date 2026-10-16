import { eq, raises, run, test } from './spec.ts';
import { add, apply, checkedFetch, div, fetchText, mul, sub } from './fetching.ts';

test('opérations de base', () => {
  eq([add(2, 3), sub(2, 3), mul(2, 3), div(6, 3)], [5, -1, 6, 2], 'add, sub, mul, div');
  eq(apply('mul', 4, 5), 20, "apply('mul', 4, 5)");
});

test('div : diviseur nul → RangeError', async () => {
  await raises(() => div(1, 0), 'div(1, 0)', RangeError);
});

test('checkedFetch : renvoie la réponse en cas de succès', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('bonjour', { status: 200 });
  try {
    const response = await checkedFetch('https://exemple.test/a');
    eq(await response.text(), 'bonjour', 'corps de la réponse');
    eq(await fetchText('https://exemple.test/a'), 'bonjour', 'fetchText');
  } finally {
    globalThis.fetch = original;
  }
});

test('checkedFetch : REJETTE (et ne renvoie pas une erreur) quand le statut est un échec', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('non', { status: 503 });
  try {
    const e = await raises(() => checkedFetch('https://exemple.test/b'), 'checkedFetch avec un statut 503', Error);
    eq(e.message, 'Request failed: 503', 'message d’erreur');
    await raises(() => fetchText('https://exemple.test/b'), 'fetchText avec un statut 503', Error);
  } finally {
    globalThis.fetch = original;
  }
});

await run();

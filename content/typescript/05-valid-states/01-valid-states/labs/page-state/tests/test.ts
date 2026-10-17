import { eq, run, test } from './spec.ts';
import { failed, initialState, navigate, pagesToFetch, render, succeeded } from './page.ts';

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') { Object.values(o).forEach(deepFreeze); Object.freeze(o); }
  return o;
}

test('navigate puis succès', () => {
  const s0 = deepFreeze(initialState);
  eq(render(s0), 'Accueil : rien à afficher', 'état initial');
  const s1 = deepFreeze(navigate(s0, 'TypeScript'));
  eq(render(s1), 'Chargement de TypeScript…', 'en cours');
  eq(pagesToFetch(s1), ['TypeScript'], 'à charger');
  const s2 = succeeded(s1, 'TypeScript', 'Un langage typé.');
  eq(render(s2), '<h1>TypeScript</h1>\nUn langage typé.', 'chargée');
  eq(pagesToFetch(s2), [], 'plus rien à charger');
});

test('erreur puis nouvelle tentative', () => {
  const s1 = deepFreeze(failed(navigate(initialState, 'Go'), 'Go', 'timeout'));
  eq(render(s1), 'Erreur sur Go : timeout', 'erreur');
  const s2 = navigate(s1, 'Go');
  eq(render(s2), 'Chargement de Go…', "la nouvelle tentative efface l'erreur");
});

test('course entre deux pages', () => {
  let s = navigate(initialState, 'A');
  s = deepFreeze(navigate(s, 'B'));
  eq(pagesToFetch(s), ['A', 'B'], 'deux requêtes en attente');
  s = succeeded(s, 'B', 'contenu B');
  s = succeeded(s, 'A', 'contenu A');
  eq(render(s), '<h1>B</h1>\ncontenu B', 'la réponse tardive de A ne remplace pas B');
  s = navigate(s, 'A');
  eq(render(s), '<h1>A</h1>\ncontenu A', 'A est déjà en cache');
});

test("navigate ne relance pas une page en cours", () => {
  const s1 = deepFreeze(navigate(initialState, 'A'));
  const s2 = navigate(navigate(s1, 'B'), 'A');
  eq(s2.requests.A, { state: 'pending' }, 'toujours pending');
});

await run();

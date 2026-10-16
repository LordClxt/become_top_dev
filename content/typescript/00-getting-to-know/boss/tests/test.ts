import { check, eq, raises, run, test } from './spec.ts';
import { mapResult, unwrap, validateSignUp } from './signup.ts';

test('formulaire valide : normalise l’email, convertit l’âge', () => {
  eq(validateSignUp({ email: '  Ada@Example.COM ', age: '36', newsletter: 'ON' }),
    { ok: true, value: { email: 'ada@example.com', age: 36, newsletter: true } }, 'formulaire valide');
});

test('newsletter absente : false par défaut', () => {
  const r = validateSignUp({ email: 'a@b.fr', age: 40 });
  eq(r, { ok: true, value: { email: 'a@b.fr', age: 40, newsletter: false } }, 'newsletter par défaut');
});

test('toutes les erreurs sont rapportées, dans l’ordre', () => {
  eq(validateSignUp({ email: 'nope', age: 'abc', newsletter: 'peut-être' }),
    { ok: false, errors: ['email invalide', 'âge invalide', 'newsletter invalide'] }, 'trois erreurs');
  eq(validateSignUp({ email: 'a@b.fr', age: 17 }), { ok: false, errors: ['âge invalide'] }, 'mineur');
});

test('âge : entier entre 18 et 120, nombre ou texte', () => {
  for (const age of [17, 121, 30.5, '', ' ', null, true, NaN]) {
    eq(validateSignUp({ email: 'a@b.fr', age }).ok, false, `âge ${String(age)} doit être refusé`);
  }
  for (const age of [18, 120, ' 42 ']) {
    eq(validateSignUp({ email: 'a@b.fr', age }).ok, true, `âge ${String(age)} doit être accepté`);
  }
});

test('ce qui n’est pas un objet est un formulaire invalide', () => {
  for (const raw of [null, undefined, 'x', 3, []]) {
    eq(validateSignUp(raw), { ok: false, errors: ['formulaire invalide'] }, `validateSignUp(${JSON.stringify(raw)})`);
  }
});

test('mapResult : transforme un succès, laisse passer un échec', () => {
  const ok = mapResult(validateSignUp({ email: 'a@b.fr', age: 30 }), (form) => form.age + 1);
  eq(ok, { ok: true, value: 31 }, 'mapResult succès');
  const ko = mapResult(validateSignUp({}), (form) => form.age);
  check(!ko.ok && ko.errors.length === 2, 'mapResult doit conserver les erreurs d’un échec');
});

test('unwrap : valeur ou erreur qui liste tout', async () => {
  eq(unwrap(validateSignUp({ email: 'a@b.fr', age: 30 })).age, 30, 'unwrap succès');
  const e = await raises(() => unwrap(validateSignUp({ email: 'x', age: 1 })), 'unwrap échec', Error);
  eq(e.message, 'email invalide; âge invalide', 'message de unwrap');
});

await run();

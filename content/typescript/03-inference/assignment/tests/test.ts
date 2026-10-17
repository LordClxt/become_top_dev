import { eq, run, test } from './spec.ts';
import { FIELDS, rules, summary, validate } from './signup.ts';

const valid = { email: 'Ada@Example.com', password: 'correcthorse', age: 36 };

test('FIELDS et rules', () => {
  eq(FIELDS, ['email', 'password', 'age', 'newsletter'], 'FIELDS');
  eq(Object.keys(rules).sort(), ['age', 'email', 'newsletter', 'password'], 'une règle par champ');
  eq(rules.email('a@b'), null, 'email valide');
  eq(rules.password('court'), '8 caractères minimum', 'mot de passe court');
  eq(rules.age(12), 'âge invalide', 'âge 12');
  eq(rules.age(36.5), 'âge invalide', 'âge non entier');
  eq(rules.age(120), null, 'âge 120');
  eq(rules.newsletter(undefined), null, 'newsletter absent');
  eq(rules.newsletter('oui'), 'booléen attendu', "newsletter 'oui'");
});

test('validate : succès', () => {
  eq(validate(valid), { ok: true, value: { email: 'ada@example.com', password: 'correcthorse', age: 36 } }, 'sans newsletter');
  eq(validate({ ...valid, newsletter: true }), { ok: true, value: { email: 'ada@example.com', password: 'correcthorse', age: 36, newsletter: true } }, 'newsletter true');
  const r = validate({ ...valid, newsletter: false });
  eq(r.ok && Object.keys(r.value).includes('newsletter'), false, 'newsletter false : pas de clé');
});

test('validate : erreurs', () => {
  eq(validate({ email: 'ada', password: 'correcthorse', age: 7 }), { ok: false, errors: { email: 'e-mail invalide', age: 'âge invalide' } }, 'deux erreurs');
  eq(validate({}), { ok: false, errors: { email: 'e-mail invalide', password: '8 caractères minimum', age: 'âge invalide' } }, 'formulaire vide');
});

test('summary', () => {
  eq(summary(validate(valid)), 'inscrit : ada@example.com', 'succès');
  eq(summary(validate({ email: 'ada', password: 'correcthorse', age: 7 })), '2 erreur(s) : email, age', 'échec');
});

await run();

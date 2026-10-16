import { eq, raises, run, test } from './spec.ts';
import { parseEvent, parseEvents, summarize } from './events.ts';

test('parseEvent : accepte les trois formes valides', () => {
  eq(parseEvent({ type: 'user-created', id: 'u1', email: 'a@b.fr' }), { type: 'user-created', id: 'u1', email: 'a@b.fr' }, 'user-created');
  eq(parseEvent({ type: 'user-deleted', id: 'u1' }), { type: 'user-deleted', id: 'u1' }, 'user-deleted');
  eq(parseEvent({ type: 'purchase', id: 'p1', amountCents: 1999 }), { type: 'purchase', id: 'p1', amountCents: 1999 }, 'purchase');
});

test('parseEvent : ignore les champs inconnus (ils ne sont pas recopiés)', () => {
  eq(parseEvent({ type: 'user-deleted', id: 'u1', extra: true }), { type: 'user-deleted', id: 'u1' }, 'champ en trop');
});

test('parseEvent : rejette ce qui n’est pas un objet', async () => {
  for (const raw of [null, undefined, 42, 'x', [], true]) {
    await raises(() => parseEvent(raw), `parseEvent(${JSON.stringify(raw)})`, TypeError);
  }
});

test('parseEvent : rejette un type inconnu, un champ manquant ou invalide', async () => {
  await raises(() => parseEvent({ type: 'refund', id: 'x' }), 'type inconnu', TypeError);
  await raises(() => parseEvent({ type: 'user-deleted' }), 'id manquant', TypeError);
  await raises(() => parseEvent({ type: 'user-deleted', id: '' }), 'id vide', TypeError);
  await raises(() => parseEvent({ type: 'user-created', id: 'u', email: 'pas-un-email' }), 'email sans @', TypeError);
  await raises(() => parseEvent({ type: 'purchase', id: 'p', amountCents: '12' }), 'montant texte', TypeError);
  await raises(() => parseEvent({ type: 'purchase', id: 'p', amountCents: 12.5 }), 'montant décimal', TypeError);
  await raises(() => parseEvent({ type: 'purchase', id: 'p', amountCents: 0 }), 'montant nul', TypeError);
});

test('parseEvents : garde les valides, compte les rejetés', () => {
  const result = parseEvents([
    { type: 'user-created', id: 'u1', email: 'a@b.fr' },
    { type: 'nope' },
    null,
    { type: 'purchase', id: 'p1', amountCents: 500 },
  ]);
  eq(result.events.length, 2, 'événements valides');
  eq(result.rejected, 2, 'événements rejetés');
});

test('summarize : utilisateurs actifs et chiffre d’affaires', () => {
  const result = summarize([
    { type: 'user-created', id: 'u1', email: 'a@b.fr' },
    { type: 'user-created', id: 'u2', email: 'c@d.fr' },
    { type: 'purchase', id: 'p1', amountCents: 1000 },
    { type: 'user-deleted', id: 'u1' },
    { type: 'purchase', id: 'p2', amountCents: 250 },
  ]);
  eq(result, { users: 1, revenueCents: 1250 }, 'summarize');
  eq(summarize([]), { users: 0, revenueCents: 0 }, 'summarize([])');
});

test('summarize : un utilisateur créé deux fois ne compte qu’une fois', () => {
  const e = { type: 'user-created', id: 'u1', email: 'a@b.fr' } as const;
  eq(summarize([e, e]).users, 1, 'doublon');
});

await run();

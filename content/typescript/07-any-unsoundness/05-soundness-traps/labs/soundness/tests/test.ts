import { eq, run, test } from './spec.ts';
import { announce, countLegs, Fox, Hen, nth, withAnimal } from './farm.ts';

test('nth', () => {
  eq(nth([10, 20], 1), 20, 'dans les limites');
  eq(nth([10, 20], 2), undefined, 'trop loin');
  eq(nth([10, 20], -1), undefined, 'négatif');
});

test('countLegs et withAnimal', () => {
  const henhouse: Hen[] = [new Hen(), new Hen()];
  eq(countLegs(henhouse), 4, 'pattes');
  const farm = withAnimal(henhouse, new Fox());
  eq(farm.length, 3, 'nouveau tableau');
  eq(henhouse.length, 2, "le poulailler n'a pas de renard");
  eq(henhouse.every((h) => h.cluck() === 'cot cot'), true, 'que des poules');
});

test('announce', () => {
  const erase = (f: { author?: string; fact: string }) => { delete f.author; f.fact = 'modifié'; };
  eq(announce({ fact: 'les poules ont des dents', author: ' Ada ' }, erase), 'Ada : les poules ont des dents', 'avec auteur');
  eq(announce({ fact: 'les renards volent' }, erase), 'anonyme : les renards volent', 'sans auteur');
});

await run();

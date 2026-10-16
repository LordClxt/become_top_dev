import { check, eq, run, test } from './spec.ts';
import { alice, initial, isPerson, makePeople, makePerson, parsePerson } from './people.ts';

test('makePerson et alice ont un age', () => {
  eq(makePerson('Bob', 41), { name: 'Bob', age: 41 }, "makePerson('Bob', 41)");
  eq(typeof alice.age, 'number', 'alice.age doit être un nombre : le littéral doit être complet');
});

test('makePeople : un Person complet par nom', () => {
  eq(makePeople(['a', 'b'], 20), [{ name: 'a', age: 20 }, { name: 'b', age: 20 }], "makePeople(['a', 'b'], 20)");
});

test('initial : première lettre en majuscule', () => {
  eq(initial('ada'), 'A', "initial('ada')");
  eq(typeof initial('x'), 'string', 'le retour est un primitif string');
});

test('isPerson : vérifie vraiment la forme', () => {
  check(isPerson({ name: 'Ada', age: 36 }), 'un objet complet est un Person');
  for (const bad of [null, undefined, 3, 'x', {}, { name: 'Ada' }, { name: 1, age: 2 }, { name: 'Ada', age: '36' }]) {
    check(!isPerson(bad), `isPerson(${JSON.stringify(bad)}) doit être faux`);
  }
});

test('parsePerson : le JSON invalide donne null', () => {
  eq(parsePerson('{"name":"Ada","age":36}'), { name: 'Ada', age: 36 }, 'JSON valide');
  eq(parsePerson('{"name":"Ada"}'), null, 'JSON sans age');
  eq(parsePerson('42'), null, 'JSON qui n’est pas un objet');
});

await run();

import { check, eq, run, test } from './spec.ts';
import { byCapital, capitals, states } from './states.ts';

test('les données : chaque État a une capitale', () => {
  for (const state of states) {
    check(typeof state.capital === 'string' && state.capital.length > 0,
      `${state.name} n'a pas de propriété « capital » : il reste une faute de frappe dans les données`);
  }
});

test('capitals : une capitale par État, dans l’ordre', () => {
  eq(capitals(states), ['Montgomery', 'Juneau', 'Phoenix', 'Little Rock'], 'capitals(states)');
  eq(capitals([]), [], 'capitals([])');
});

test('byCapital : trouve un État sans tenir compte de la casse', () => {
  eq(byCapital(states, 'juneau')?.name, 'Alaska', "byCapital(states, 'juneau')");
  eq(byCapital(states, 'PHOENIX')?.name, 'Arizona', "byCapital(states, 'PHOENIX')");
});

test('byCapital : undefined si rien ne correspond', () => {
  eq(byCapital(states, 'Atlantis'), undefined, "byCapital(states, 'Atlantis')");
});

await run();

import { eq, run, test } from './spec.ts';
import { initialState, reducer, visibleTodos } from './store.ts';
import type { Action, State } from './store.ts';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function play(...actions: Action[]): State {
  return actions.reduce((state, action) => reducer(deepFreeze(state), action), initialState);
}

test('add : id croissants, titre nettoyé, titre vide ignoré', () => {
  const s = play({ type: 'add', title: ' Lire ' }, { type: 'add', title: 'Écrire' }, { type: 'add', title: '   ' });
  eq(s.todos, [{ id: 1, title: 'Lire', done: false }, { id: 2, title: 'Écrire', done: false }], 'todos');
  eq(s.nextId, 3, 'nextId');
});

test('toggle : bascule une tâche, ignore un id inconnu', () => {
  const s = play({ type: 'add', title: 'a' }, { type: 'add', title: 'b' }, { type: 'toggle', id: 2 }, { type: 'toggle', id: 99 });
  eq(s.todos.map((t) => t.done), [false, true], 'done');
  eq(play({ type: 'add', title: 'a' }, { type: 'toggle', id: 1 }, { type: 'toggle', id: 1 }).todos[0]?.done, false, 'double bascule');
});

test('remove et clear-done', () => {
  const s = play({ type: 'add', title: 'a' }, { type: 'add', title: 'b' }, { type: 'add', title: 'c' },
    { type: 'toggle', id: 1 }, { type: 'toggle', id: 3 }, { type: 'remove', id: 2 });
  eq(s.todos.map((t) => t.id), [1, 3], 'après remove');
  eq(reducer(s, { type: 'clear-done' }).todos, [], 'après clear-done');
});

test('filter et visibleTodos', () => {
  const s = play({ type: 'add', title: 'a' }, { type: 'add', title: 'b' }, { type: 'toggle', id: 1 });
  eq(visibleTodos(s).length, 2, 'all');
  eq(visibleTodos(reducer(s, { type: 'filter', filter: 'open' })).map((t) => t.id), [2], 'open');
  eq(visibleTodos(reducer(s, { type: 'filter', filter: 'done' })).map((t) => t.id), [1], 'done');
});

test('les états ne sont jamais modifiés (états gelés en profondeur)', () => {
  const s0 = deepFreeze(initialState);
  const s1 = reducer(s0, { type: 'add', title: 'x' });
  const s2 = reducer(deepFreeze(s1), { type: 'toggle', id: 1 });
  eq(s0.todos.length, 0, 'état initial intact');
  eq(s1.todos[0]?.done, false, 's1 intact');
  eq(s2.todos[0]?.done, true, 's2');
});

await run();

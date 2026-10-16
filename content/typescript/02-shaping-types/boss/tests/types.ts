import type { Equals, Expect } from './expect.ts';
import { handlers, initialState, reducer, visibleTodos } from './store.ts';
import type { Action, ActionOf, ActionType, Handlers, State, Todo } from './store.ts';

export type Checks = [
  Expect<Equals<ActionType, 'add' | 'toggle' | 'remove' | 'filter' | 'clear-done'>>,
  Expect<Equals<keyof Handlers, ActionType>>,
  Expect<Equals<Parameters<Handlers['toggle']>[1], ActionOf<'toggle'>>>,
  Expect<Equals<ActionOf<'toggle'>, { type: 'toggle'; id: number }>>,
  Expect<Equals<ReturnType<Handlers['add']>, State>>,
  Expect<Equals<Todo['id'], number>>,
  Expect<Equals<ReturnType<typeof visibleTodos>, readonly Readonly<Todo>[]>>,
];

export const next: State = reducer(initialState, { type: 'add', title: 'x' });
export const act: Action = { type: 'filter', filter: 'done' };
export const h = handlers;

// @ts-expect-error la table doit être exhaustive : il manque des handlers
export const incomplete: Handlers = { add: handlers.add };
declare const state: State;
// @ts-expect-error l'état est en lecture seule
state.filter = 'all';
// @ts-expect-error un tableau en lecture seule n'a pas push
state.todos.push({ id: 1, title: 'x', done: false });
// @ts-expect-error l'id d'une tâche ne change pas
state.todos[0]!.id = 3;
// @ts-expect-error 'filter' exige un Filter valide
reducer(state, { type: 'filter', filter: 'maybe' });

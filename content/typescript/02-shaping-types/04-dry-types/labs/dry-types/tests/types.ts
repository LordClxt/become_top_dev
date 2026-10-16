import type { Equals, Expect } from './expect.ts';
import { flip, getUserInfo, topNav, update } from './derived.ts';
import type { Action, ActionType, Flip, Options, OptionsUpdate, State, TopNavState, UserInfo } from './derived.ts';

export type Checks = [
  Expect<Equals<TopNavState, { userId: string; pageTitle: string; recentFiles: string[] }>>,
  Expect<Equals<Options, { width: number; height: number; color: string; label: string }>>,
  Expect<Equals<OptionsUpdate, { width?: number; height?: number; color?: string; label?: string }>>,
  Expect<Equals<UserInfo, { userId: string; name: string; age: number }>>,
  Expect<Equals<ActionType, 'save' | 'load'>>,
  Expect<Equals<Flip<{ a: 'x'; b: 'y' }>, { x: 'a'; y: 'b' }>>,
  Expect<Equals<ReturnType<typeof flip<{ ok: 'yes' }>>, { yes: 'ok' }>>,
  Expect<Equals<Parameters<typeof topNav>[0], State>>,
];

export const nav: TopNavState = topNav({ userId: 'u', pageTitle: 't', recentFiles: [], pageContents: '' });
export const opts = update({ width: 1, height: 2, color: 'c', label: 'l' }, { width: 5 });
export const info = getUserInfo('u');
export type A = Action;

// @ts-expect-error pageContents n'appartient pas à TopNavState
export const bad: TopNavState = { userId: 'u', pageTitle: 't', recentFiles: [], pageContents: 'x' };
// @ts-expect-error width est un nombre
update({ width: 1, height: 2, color: 'c', label: 'l' }, { width: 'large' });

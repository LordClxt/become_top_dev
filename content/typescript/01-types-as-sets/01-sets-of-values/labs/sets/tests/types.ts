import type { Equals, Expect } from './expect.ts';
import type { AllKeys, Day, Named, Aged, Person, SharedKeys, Weekday, Weekend, Without } from './sets.ts';
import { isWeekend, makePerson, swap } from './sets.ts';

export type Checks = [
  Expect<Equals<Weekday, 'mon' | 'tue' | 'wed' | 'thu' | 'fri'>>,
  Expect<Equals<Weekend, 'sat' | 'sun'>>,
  Expect<Equals<Day, Weekday | Weekend>>,
  Expect<Equals<Person, Named & Aged>>,
  Expect<Equals<keyof Person, 'name' | 'age'>>,
  Expect<Equals<SharedKeys<{ a: 1; b: 2 }, { b: 3; c: 4 }>, 'b'>>,
  Expect<Equals<AllKeys<{ a: 1; b: 2 }, { b: 3; c: 4 }>, 'a' | 'b' | 'c'>>,
  Expect<Equals<Without<string | Date, string | number>, Date>>,
  Expect<Equals<Without<'a' | 'b' | 'c', 'b'>, 'a' | 'c'>>,
  Expect<Equals<Parameters<typeof swap>[0], readonly [number, number]>>,
  Expect<Equals<ReturnType<typeof swap>, [number, number]>>,
];

// Narrowing par la garde de type : dans le if, day est un Weekend.
export function label(day: Day): string {
  if (isWeekend(day)) {
    const w: Weekend = day;
    return w;
  }
  const d: Weekday = day;
  return d;
}

// @ts-expect-error 'funday' n'appartient pas à l'ensemble des jours
export const bad: Day = 'funday';
// @ts-expect-error une paire n'est pas une liste de trois nombres
swap([1, 2, 3]);
// @ts-expect-error il manque age : la valeur n'est pas dans l'intersection
export const half: Person = { name: 'Ada' };

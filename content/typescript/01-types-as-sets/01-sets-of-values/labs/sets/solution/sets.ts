export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
export type Weekend = 'sat' | 'sun';
export type Day = Weekday | Weekend;

const WEEKEND: readonly Day[] = ['sat', 'sun'];

/** Garde de type : à l'intérieur du `if`, `day` est un Weekend. */
export function isWeekend(day: Day): day is Weekend {
  return WEEKEND.includes(day);
}

export interface Named {
  name: string;
}
export interface Aged {
  age: number;
}
/** Une valeur de ce type est à la fois Named ET Aged : elle a les deux propriétés. */
export type Person = Named & Aged;

export function makePerson(name: string, age: number): Person {
  return { name, age };
}

/** Clés présentes dans A ET dans B. */
export type SharedKeys<A, B> = keyof A & keyof B;
/** Clés présentes dans A OU dans B. */
export type AllKeys<A, B> = keyof A | keyof B;

/** Ce qui reste de T quand on retire les membres qui sont dans U (différence d'ensembles). */
export type Without<T, U> = T extends U ? never : T;

/** Échange les deux éléments d'une paire (tuple de longueur exactement 2). */
export function swap(pair: readonly [number, number]): [number, number] {
  return [pair[1], pair[0]];
}

// Chaque type ci-dessous vaut `never` ou `unknown` pour l'instant : ce n'est pas la bonne réponse.
// Pense en ensembles de valeurs.

// TODO 1 : Weekday = lundi à vendredi ('mon' … 'fri'), Weekend = 'sat' | 'sun', Day = leur union.
export type Weekday = never;
export type Weekend = never;
export type Day = never;

// TODO 2 : à l'intérieur d'un `if (isWeekend(day))`, TypeScript doit savoir que day est un Weekend.
export function isWeekend(day: Day): boolean {
  throw new Error('TODO: isWeekend');
}

export interface Named {
  name: string;
}
export interface Aged {
  age: number;
}
// TODO 3 : Person est l'ensemble des valeurs qui sont à la fois Named ET Aged.
export type Person = unknown;

export function makePerson(name: string, age: number): Person {
  throw new Error('TODO: makePerson');
}

// TODO 4 : les clés communes à A et B, puis les clés de A ou de B.
export type SharedKeys<A, B> = never;
export type AllKeys<A, B> = never;

// TODO 5 : Without<T, U> retire de T les membres qui sont dans U (comme le type Exclude de la bibliothèque).
export type Without<T, U> = never;

// TODO 6 : le paramètre doit être une paire (exactement deux nombres), pas un tableau de longueur quelconque.
export function swap(pair: number[]): number[] {
  throw new Error('TODO: swap');
}

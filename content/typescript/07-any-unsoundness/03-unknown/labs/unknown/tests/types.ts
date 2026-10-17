import type { Equals, Expect } from './expect.ts';
import * as books from './books.ts';
import type { Book } from './books.ts';

export type Checks = [
  Expect<Equals<ReturnType<typeof books.parseJSON>, unknown>>,
];

declare const values: unknown[];
const filtered = values.filter(books.isBook);
export type Checks2 = [Expect<Equals<typeof filtered, Book[]>>];

// le générique de retour seul (load<T>) doit avoir disparu
export type NoLoad = Expect<Equals<'load' extends keyof typeof books ? true : false, false>>;

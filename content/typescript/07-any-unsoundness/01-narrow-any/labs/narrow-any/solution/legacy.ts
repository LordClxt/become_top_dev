/** Bibliothèque externe mal typée : ne pas modifier. */
export const oldLibrary = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetch(id: string): any {
    return { id, name: 'Ada', age: 36 };
  },
};

export interface User {
  id: string;
  name: string;
  age: number;
}

export function countItems(list: readonly unknown[]): number {
  return list.length;
}

export function pickKeys(record: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((k) => k in record).map((k) => [k, record[k]]));
}

export function callTwice(fn: () => unknown): [unknown, unknown] {
  return [fn(), fn()];
}

/** L'annotation de retour empêche l'any de la bibliothèque de fuir. */
export function loadUser(id: string): User {
  return oldLibrary.fetch(id);
}

export function userLabel(id: string): string {
  const { name, age } = loadUser(id);
  return `${name} (${age} ans)`;
}

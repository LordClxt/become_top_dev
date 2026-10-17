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

// TODO 1 à 5 : resserre les types, sans changer le comportement.
export function countItems(list: any) {
  return list.length;
}

export function pickKeys(record: any, keys: string[]): any {
  return Object.fromEntries(keys.filter((k) => k in record).map((k) => [k, record[k]]));
}

export function callTwice(fn: any) {
  return [fn(), fn()];
}

export function loadUser(id: string) {
  return oldLibrary.fetch(id);
}

export function userLabel(id: string) {
  throw new Error('TODO: userLabel');
}

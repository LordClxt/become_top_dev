export type MyPartial<T> = { [K in keyof T]?: T[K] };
export type MyRequired<T> = { [K in keyof T]-?: T[K] };
export type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
/** K est contraint aux clés de T : l'erreur apparaît à l'utilisation, pas dans la définition. */
export type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
export type MyOmit<T, K extends keyof T> = { [P in keyof T as P extends K ? never : P]: T[P] };
export type MyRecord<K extends PropertyKey, V> = { [P in K]: V };

export function pick<T extends object, K extends keyof T>(obj: T, ...keys: K[]): MyPick<T, K> {
  const picked: MyPartial<MyPick<T, K>> = {};
  for (const key of keys) picked[key] = obj[key];
  // Assertion justifiée : chaque clé demandée vient d'être copiée.
  return picked as MyPick<T, K>;
}

export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): MyOmit<T, K> {
  const removed = new Set<PropertyKey>(keys);
  // Assertion justifiée : on garde exactement les clés propres de obj qui ne sont pas dans keys.
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !removed.has(key))) as MyOmit<T, K>;
}

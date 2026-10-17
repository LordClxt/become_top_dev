// TODO 1 à 4 : sans les utilitaires de la bibliothèque standard.
export type MyPartial<T> = T;
export type MyRequired<T> = T;
export type MyReadonly<T> = T;
export type MyPick<T, K> = T;
export type MyOmit<T, K> = T;
export type MyRecord<K, V> = { [key: string]: V };

// TODO 5
export function pick<T extends object, K extends keyof T>(obj: T, ...keys: K[]): MyPick<T, K> {
  throw new Error('TODO: pick');
}

export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): MyOmit<T, K> {
  throw new Error('TODO: omit');
}

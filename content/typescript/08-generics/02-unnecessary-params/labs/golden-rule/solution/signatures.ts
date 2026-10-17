export function third<C>(a: unknown, b: unknown, c: C): C {
  return c;
}

export function parseJSON(text: string): unknown {
  return JSON.parse(text);
}

export function printProperty<T>(obj: T, key: keyof T): string {
  return `${String(key)} = ${String(obj[key])}`;
}

/** K est utile : il relie la clé passée au type de retour. */
export function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

export function getLength(x: ArrayLike<unknown>): number {
  return x.length;
}

export function join(els: readonly (string | number)[]): string {
  return els.map(String).join(',');
}

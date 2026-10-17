// TODO : retire les paramètres de type inutiles (règle d'or), garde les utiles.
export function third<A, B, C>(a: A, b: B, c: C): C {
  return c;
}

export function parseJSON<T>(text: string): T {
  return JSON.parse(text);
}

export function printProperty<T, K extends keyof T>(obj: T, key: K): string {
  return `${String(key)} = ${String(obj[key])}`;
}

export function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

interface Lengthy { length: number }
export function getLength<T extends Lengthy>(x: T): number {
  return x.length;
}

export class Joiner<T extends string | number> {
  join(els: T[]): string {
    return els.map(String).join(',');
  }
}

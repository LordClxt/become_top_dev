export type BinaryFn = (a: number, b: number) => number;

export const add: BinaryFn = (a, b) => a + b;
export const sub: BinaryFn = (a, b) => a - b;
export const mul: BinaryFn = (a, b) => a * b;
export const div: BinaryFn = (a, b) => {
  if (b === 0) throw new RangeError('division par zéro');
  return a / b;
};

export const ops = { add, sub, mul, div };

export function apply(op: keyof typeof ops, a: number, b: number): number {
  return ops[op](a, b);
}

/** fetch qui rejette quand le statut HTTP n'est pas un succès. Le type de fetch s'applique à toute la fonction. */
export const checkedFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error('Request failed: ' + response.status);
  }
  return response;
};

/** Les arguments de fetch, extraits de sa signature. */
export type FetchArgs = Parameters<typeof fetch>;

export async function fetchText(...args: FetchArgs): Promise<string> {
  const response = await checkedFetch(...args);
  return response.text();
}

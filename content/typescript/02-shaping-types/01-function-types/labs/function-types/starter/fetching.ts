// TODO 1 : nomme la signature `BinaryFn` (deux nombres → un nombre) et applique-la à add, sub, mul, div
// (div lève RangeError si le diviseur est 0).
export function add(a: number, b: number) { return a + b; }
export function sub(a: number, b: number) { return a - b; }
export function mul(a: number, b: number) { return a * b; }
export function div(a: number, b: number) { return a / b; }
export type BinaryFn = never;

export const ops = { add, sub, mul, div };

export function apply(op: keyof typeof ops, a: number, b: number): number {
  return ops[op](a, b);
}

// TODO 2 : ce wrapper a un bug que TypeScript ne voit pas (return au lieu de throw).
// Transforme-le en `const checkedFetch: typeof fetch = async (input, init) => …` : l'annotation te montrera l'erreur.
export async function checkedFetch(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok) {
    return new Error('Request failed: ' + response.status);
  }
  return response;
}

// TODO 3 : FetchArgs = les paramètres de fetch, extraits de sa signature.
export type FetchArgs = never;

// fetchText(...args) utilise checkedFetch et renvoie le texte de la réponse.
export async function fetchText(...args: FetchArgs): Promise<string> {
  throw new Error('TODO: fetchText');
}

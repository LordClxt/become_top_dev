type Leaf = string | number | boolean | bigint | null | undefined | Date | readonly unknown[];

/** Tous les chemins pointés de T, intermédiaires compris ; tableaux et dates sont des feuilles. */
export type Paths<T> = T extends Leaf
  ? never
  : { [K in keyof T & string]: K | `${K}.${Paths<T[K]>}` }[keyof T & string];

/** Le type de la valeur au bout d'un chemin pointé. */
export type PathValue<T, P extends string> =
  P extends `${infer Head}.${infer Rest}`
    ? Head extends keyof T ? PathValue<T[Head], Rest> : never
    : P extends keyof T ? T[P] : never;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function getPath<T, P extends Paths<T>>(obj: T, path: P): PathValue<T, P> {
  let current: unknown = obj;
  for (const key of path.split('.')) {
    current = isRecord(current) ? current[key] : undefined;
  }
  // Assertion justifiée : P est un chemin valide de T, on a suivi ses segments un par un.
  return current as PathValue<T, P>;
}

export type Handlers<E> = { [K in keyof E & string as `on${Capitalize<K>}`]?: (payload: E[K]) => void };

export function dispatch<E, K extends keyof E & string>(handlers: Handlers<E>, event: K, payload: E[K]): boolean {
  const name = `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;
  // Assertion justifiée : name est exactement `on${Capitalize<K>}`, dont le handler reçoit un E[K].
  const handler = (handlers as Record<string, ((payload: E[K]) => void) | undefined>)[name];
  if (!handler) return false;
  handler(payload);
  return true;
}

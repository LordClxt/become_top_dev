export class ParseError extends Error {
  path: string;
  constructor(path: string, message: string) {
    super(`${path} : ${message}`);
    this.name = 'ParseError';
    this.path = path;
  }
}

export type SafeResult<T> =
  | { success: true; data: T }
  | { success: false; error: ParseError };

export interface Schema<T> {
  /** Valide `input` et renvoie la valeur typée, ou lève ParseError. */
  parse(input: unknown): T;
  /** Comme parse, mais renvoie un résultat au lieu de lever. */
  safeParse(input: unknown): SafeResult<T>;
  /** Interne : valide `input` en connaissant son chemin (`$`, `$.age`…) pour des erreurs précises. */
  run(input: unknown, path: string): T;
}

/** Le type TypeScript que produit un schéma. */
export type Infer<S> = S extends Schema<infer T> ? T : never;

export function schema<T>(run: (input: unknown, path: string) => T): Schema<T> {
  return {
    run,
    parse: (input) => run(input, '$'),
    safeParse(input) {
      try {
        return { success: true, data: run(input, '$') };
      } catch (e) {
        if (e instanceof ParseError) return { success: false, error: e };
        throw e;
      }
    },
  };
}

export const string = (): Schema<string> =>
  schema((input, path) => {
    if (typeof input !== 'string') throw new ParseError(path, 'une chaîne est attendue');
    return input;
  });

export const number = (): Schema<number> =>
  schema((input, path) => {
    if (typeof input !== 'number' || Number.isNaN(input)) throw new ParseError(path, 'un nombre est attendu');
    return input;
  });

export const boolean = (): Schema<boolean> =>
  schema((input, path) => {
    if (typeof input !== 'boolean') throw new ParseError(path, 'un booléen est attendu');
    return input;
  });

export function object<S extends Record<string, Schema<unknown>>>(shape: S): Schema<{ [K in keyof S]: Infer<S[K]> }> {
  return schema((input, path) => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new ParseError(path, 'un objet est attendu');
    }
    const source = input as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(shape)) {
      result[key] = shape[key]!.run(source[key], `${path}.${key}`);
    }
    return result as { [K in keyof S]: Infer<S[K]> };
  });
}

/** Rend un schéma tolérant à undefined. */
export function optional<T>(inner: Schema<T>): Schema<T | undefined> {
  return schema((input, path) => (input === undefined ? undefined : inner.run(input, path)));
}


// Jalon 1 : un schéma qui n'accepte qu'UNE valeur (type singleton). Message : `la valeur "x" est attendue`.
export function literal<T extends string | number | boolean | null>(value: T): Schema<T> {
  throw new Error('TODO: literal');
}

// Jalon 2 : union d'ensembles. Essaie les schémas dans l'ordre ; le premier qui accepte gagne.
// Si aucun n'accepte : ParseError(path, `aucune variante ne convient (…)`) avec les raisons jointes par « | ».
// Les erreurs qui ne sont pas des ParseError doivent être relancées.
export function union<S extends readonly [Schema<unknown>, ...Schema<unknown>[]]>(
  ...options: S
): Schema<Infer<S[number]>> {
  throw new Error('TODO: union');
}

// Jalon 3 : un tableau dont chaque élément respecte `item`. Le chemin d'une erreur porte l'indice : `$[2]`, `$.tags[0]`.
export function array<T>(item: Schema<T>): Schema<T[]> {
  throw new Error('TODO: array');
}

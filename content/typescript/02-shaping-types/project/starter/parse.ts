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

/** Un schéma d'objet garde sa forme (`shape`) pour qu'on puisse en dériver d'autres (pick, partial). */
export interface ObjectSchema<S extends Record<string, Schema<unknown>>> extends Schema<{ [K in keyof S]: Infer<S[K]> }> {
  readonly shape: S;
}

export function object<S extends Record<string, Schema<unknown>>>(shape: S): ObjectSchema<S> {
  const base = schema((input, path) => {
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
  return { ...base, shape };
}

/** Rend un schéma tolérant à undefined. */
export function optional<T>(inner: Schema<T>): Schema<T | undefined> {
  return schema((input, path) => (input === undefined ? undefined : inner.run(input, path)));
}


/** Accepte exactement une valeur : un type singleton. */
export function literal<T extends string | number | boolean | null>(value: T): Schema<T> {
  return schema((input, path) => {
    if (input !== value) throw new ParseError(path, `la valeur ${JSON.stringify(value)} est attendue`);
    return value;
  });
}

/** Union d'ensembles : une valeur est acceptée si AU MOINS un schéma l'accepte (le premier gagne). */
export function union<S extends readonly [Schema<unknown>, ...Schema<unknown>[]]>(
  ...options: S
): Schema<Infer<S[number]>> {
  return schema((input, path) => {
    const reasons: string[] = [];
    for (const option of options) {
      try {
        // Assertion justifiée : option.run renvoie un membre de l'union que Infer<S[number]> décrit.
        return option.run(input, path) as Infer<S[number]>;
      } catch (e) {
        if (!(e instanceof ParseError)) throw e;
        reasons.push(e.message);
      }
    }
    throw new ParseError(path, `aucune variante ne convient (${reasons.join(' | ')})`);
  });
}

/** Un tableau dont chaque élément respecte `item` ; le chemin d'une erreur porte l'indice (`$[2]`). */
export function array<T>(item: Schema<T>): Schema<T[]> {
  return schema((input, path) => {
    if (!Array.isArray(input)) throw new ParseError(path, 'un tableau est attendu');
    return input.map((element, index) => item.run(element, `${path}[${index}]`));
  });
}


// Jalon 1 : un tableau de longueur FIXE dont chaque position a son schéma ; le type de sortie est un tuple
// (un type mappé sur le tuple de schémas). Longueur différente → ParseError(path, `un tableau de N éléments est attendu`).
// Les chemins portent l'indice : `$[1]`.
export function tuple<S extends readonly [Schema<unknown>, ...Schema<unknown>[]]>(
  ...items: S
): Schema<{ [I in keyof S]: Infer<S[I]> }> {
  throw new Error('TODO: tuple');
}

// Jalon 2 : un dictionnaire (clés inconnues) → une Map, pas un objet. Chemin d'un champ : `$.clé`.
export function record<T>(value: Schema<T>): Schema<Map<string, T>> {
  throw new Error('TODO: record');
}

// Jalon 3 : dériver un schéma d'un autre, sans le réécrire (DRY).
//  pick : seuls les champs demandés. partial : tous les champs acceptent undefined.
export function pick<S extends Record<string, Schema<unknown>>, K extends keyof S & string>(
  source: ObjectSchema<S>,
  keys: readonly K[],
): ObjectSchema<Pick<S, K>> {
  throw new Error('TODO: pick');
}

export function partial<S extends Record<string, Schema<unknown>>>(
  source: ObjectSchema<S>,
): ObjectSchema<{ [K in keyof S]: Schema<Infer<S[K]> | undefined> }> {
  throw new Error('TODO: partial');
}

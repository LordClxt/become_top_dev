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


/** Un tableau de longueur fixe dont chaque position a son schéma : le type de sortie est un tuple. */
export function tuple<S extends readonly [Schema<unknown>, ...Schema<unknown>[]]>(
  ...items: S
): Schema<{ [I in keyof S]: Infer<S[I]> }> {
  return schema((input, path) => {
    if (!Array.isArray(input) || input.length !== items.length) {
      throw new ParseError(path, `un tableau de ${items.length} éléments est attendu`);
    }
    // Assertion justifiée : map produit un élément par schéma, dans l'ordre, ce que décrit le tuple.
    return items.map((item, index) => item.run(input[index], `${path}[${index}]`)) as { [I in keyof S]: Infer<S[I]> };
  });
}

/** Un dictionnaire dont les clés sont inconnues : une Map, qui évite les pièges des clés héritées du prototype. */
export function record<T>(value: Schema<T>): Schema<Map<string, T>> {
  return schema((input, path) => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new ParseError(path, 'un objet est attendu');
    }
    const result = new Map<string, T>();
    for (const [key, entry] of Object.entries(input)) {
      result.set(key, value.run(entry, `${path}.${key}`));
    }
    return result;
  });
}

/** Un sous-ensemble des champs d'un objet, dérivé de son schéma. */
export function pick<S extends Record<string, Schema<unknown>>, K extends keyof S & string>(
  source: ObjectSchema<S>,
  keys: readonly K[],
): ObjectSchema<Pick<S, K>> {
  const shape: Partial<Pick<S, K>> = {};
  for (const key of keys) shape[key] = source.shape[key];
  // Assertion justifiée : toutes les clés demandées viennent d'être copiées.
  return object(shape as Pick<S, K>);
}

/** Tous les champs deviennent facultatifs (la valeur peut être undefined). */
export function partial<S extends Record<string, Schema<unknown>>>(
  source: ObjectSchema<S>,
): ObjectSchema<{ [K in keyof S]: Schema<Infer<S[K]> | undefined> }> {
  const shape: Record<string, Schema<unknown>> = {};
  for (const key of Object.keys(source.shape)) shape[key] = optional(source.shape[key]!);
  // Assertion justifiée : chaque champ a été enveloppé dans optional, ce que décrit le type de retour.
  return object(shape) as unknown as ObjectSchema<{ [K in keyof S]: Schema<Infer<S[K]> | undefined> }>;
}

/** Une énumération de chaînes : le modificateur `const` garde les littéraux sans `as const` chez l'appelant. */
export interface EnumSchema<T extends string> extends Schema<T> {
  readonly options: readonly T[];
}
export function enumeration<const T extends string>(values: readonly [T, ...T[]]): EnumSchema<T> {
  const allowed: readonly string[] = values;
  const isOption = (input: unknown): input is T => typeof input === 'string' && allowed.includes(input);
  const base = schema((input, path) => {
    if (!isOption(input)) throw new ParseError(path, `une valeur parmi ${values.join(', ')} est attendue`);
    return input;
  });
  return { ...base, options: values };
}

/** Affine un schéma : le type guard rétrécit le type de sortie. */
export function refine<T, U extends T>(inner: Schema<T>, guard: (value: T) => value is U, message: string): Schema<U> {
  return schema((input, path) => {
    const value = inner.run(input, path);
    if (!guard(value)) throw new ParseError(path, message);
    return value;
  });
}

/** Remplace undefined par une valeur par défaut : la sortie n'est jamais undefined. */
export function withDefault<T>(inner: Schema<T>, fallback: NoInfer<T>): Schema<T> {
  return schema((input, path) => (input === undefined ? fallback : inner.run(input, path)));
}

/** Transforme la valeur validée ; une erreur de la transformation devient une ParseError localisée. */
export function transform<T, U>(inner: Schema<T>, fn: (value: T) => U): Schema<U> {
  return schema((input, path) => {
    const value = inner.run(input, path);
    try {
      return fn(value);
    } catch (e) {
      if (e instanceof ParseError) throw e;
      throw new ParseError(path, e instanceof Error ? e.message : String(e));
    }
  });
}

/** Valide chaque entrée et sépare les valeurs valides des erreurs, sans s'arrêter. */
export function partition<T>(item: Schema<T>, inputs: readonly unknown[]): { valid: T[]; errors: ParseError[] } {
  const results = inputs.map((input, index) => {
    try {
      return { ok: true as const, value: item.run(input, `$[${index}]`) };
    } catch (e) {
      if (e instanceof ParseError) return { ok: false as const, error: e };
      throw e;
    }
  });
  return {
    valid: results.flatMap((r) => (r.ok ? [r.value] : [])),
    errors: results.flatMap((r) => (r.ok ? [] : [r.error])),
  };
}

/** Un schéma asynchrone : parseAsync renvoie toujours une promesse. */
export interface AsyncSchema<T> {
  parseAsync(input: unknown): Promise<T>;
}
export function refineAsync<T>(inner: Schema<T>, check: (value: T) => Promise<boolean>, message: string): AsyncSchema<T> {
  return {
    async parseAsync(input) {
      const value = inner.parse(input);
      if (!(await check(value))) throw new ParseError('$', message);
      return value;
    },
  };
}

/** null est accepté en plus des valeurs de `inner` : l'absence est explicite dans le type. */
export function nullable<T>(inner: Schema<T>): Schema<T | null> {
  return schema((input, path) => (input === null ? null : inner.run(input, path)));
}

type Shape = Record<string, Schema<unknown>>;
/** Une variante : le tag (littéral K) plus les champs de sa forme, dans un seul type objet. */
export type Variant<Tag extends string, K, S extends Shape> = { [P in Tag | keyof S]: P extends Tag ? K : Infer<S[P]> };
/** L'union de toutes les variantes. */
export type TaggedUnion<Tag extends string, V extends Record<string, Shape>> = {
  [K in keyof V & string]: Variant<Tag, K, V[K]>;
}[keyof V & string];

/** Une union taguée : le tag choisit la variante, puis seule sa forme est validée. */
export function discriminatedUnion<Tag extends string, V extends Record<string, Shape>>(
  tag: Tag,
  variants: V,
): Schema<TaggedUnion<Tag, V>> {
  const names = Object.keys(variants);
  return schema((input, path) => {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new ParseError(path, 'un objet est attendu');
    }
    // Assertion justifiée : input est un objet non null, on lit ses propriétés comme des inconnues.
    const kind = (input as Record<string, unknown>)[tag];
    if (typeof kind !== 'string' || !Object.hasOwn(variants, kind)) {
      throw new ParseError(`${path}.${tag}`, `une valeur parmi ${names.join(', ')} est attendue`);
    }
    const fields = object(variants[kind]!).run(input, path);
    // Assertion justifiée : on vient de valider la forme de la variante `kind`, plus son tag.
    return { [tag]: kind, ...fields } as TaggedUnion<Tag, V>;
  });
}

/** Une date AAAA-MM-JJ, convertie en Date (UTC) : un type plus précis qu'une chaîne. */
export function isoDate(): Schema<Date> {
  return schema((input, path) => {
    const message = 'une date AAAA-MM-JJ est attendue';
    if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) throw new ParseError(path, message);
    const date = new Date(`${input}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input) throw new ParseError(path, message);
    return date;
  });
}

/** Un nombre contraint : les options sont nommées, impossible de les inverser. */
export interface NumberOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}
export function numberIn(options: NumberOptions): Schema<number> {
  const { min, max, integer = false } = options;
  const base = number();
  return schema((input, path) => {
    const value = base.run(input, path);
    if (integer && !Number.isInteger(value)) throw new ParseError(path, 'un entier est attendu');
    if (min !== undefined && value < min) throw new ParseError(path, `un nombre ≥ ${min} est attendu`);
    if (max !== undefined && value > max) throw new ParseError(path, `un nombre ≤ ${max} est attendu`);
    return value;
  });
}

/** Toute valeur JSON : un type récursif exact. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export function json(): Schema<Json> {
  const check = (input: unknown, path: string): Json => {
    if (input === null || typeof input === 'boolean' || typeof input === 'string') return input;
    if (typeof input === 'number') {
      if (Number.isFinite(input)) return input;
    } else if (Array.isArray(input)) {
      return input.map((item, i) => check(item, `${path}[${i}]`));
    } else if (typeof input === 'object') {
      const proto: unknown = Object.getPrototypeOf(input);
      if (proto === Object.prototype || proto === null) {
        return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, check(v, `${path}.${k}`)]));
      }
    }
    throw new ParseError(path, 'une valeur JSON est attendue');
  };
  return schema(check);
}

/** Un schéma récursif : la fabrique n'est appelée qu'à la première validation. */
export function lazy<T>(factory: () => Schema<T>): Schema<T> {
  let inner: Schema<T> | undefined;
  return schema((input, path) => {
    inner ??= factory();
    return inner.run(input, path);
  });
}

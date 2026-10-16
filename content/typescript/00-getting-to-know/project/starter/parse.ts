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

// Jalon 1 : construis `schema` à partir de `run` (parse et safeParse).
export function schema<T>(run: (input: unknown, path: string) => T): Schema<T> {
  throw new Error('TODO: renvoyer { run, parse, safeParse }');
}

// Jalon 1 : les trois schémas primitifs. Une valeur du mauvais type lève ParseError(path, message).
export const string = (): Schema<string> => {
  throw new Error('TODO: string');
};

export const number = (): Schema<number> => {
  throw new Error('TODO: number (NaN refusé)');
};

export const boolean = (): Schema<boolean> => {
  throw new Error('TODO: boolean');
};

// Jalon 2 : un schéma d'objet. Le type de sortie est déjà calculé pour toi par `Infer`.
export function object<S extends Record<string, Schema<unknown>>>(shape: S): Schema<{ [K in keyof S]: Infer<S[K]> }> {
  throw new Error('TODO: object');
}

// Jalon 3 : tolérer undefined.
export function optional<T>(inner: Schema<T>): Schema<T | undefined> {
  throw new Error('TODO: optional');
}

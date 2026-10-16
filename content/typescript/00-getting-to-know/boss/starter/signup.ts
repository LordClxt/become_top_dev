export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; errors: readonly E[] };

export interface SignUp {
  email: string;
  age: number;
  newsletter: boolean;
}

/** Garantit à la compilation qu'un `switch` a traité toutes les variantes. */
export function assertUnreachable(value: never): never {
  throw new Error(`variante non traitée : ${JSON.stringify(value)}`);
}

// TODO : implémente les trois fonctions ci-dessous. Aucun any ; `raw` reste `unknown` jusqu'à sa validation.
// (Le seul `as` toléré : un `as Record<string, unknown>` après avoir vérifié que raw est un objet.)

/** Valide un formulaire d'inscription en rapportant TOUTES les erreurs, pas seulement la première. */
export function validateSignUp(raw: unknown): Result<SignUp, string> {
  throw new Error('TODO: valider email, age et newsletter');
}

/** Applique `f` à la valeur d'un succès ; un échec passe tel quel. */
export function mapResult<T, U, E>(result: Result<T, E>, f: (value: T) => U): Result<U, E> {
  throw new Error('TODO: mapResult');
}

/** Extrait la valeur ou lève une erreur qui liste toutes les erreurs. */
export function unwrap<T, E>(result: Result<T, E>): T {
  throw new Error('TODO: unwrap');
}

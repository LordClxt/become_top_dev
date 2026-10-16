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

function readEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

function readAge(raw: unknown): number | null {
  const age = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof age !== 'number' || !Number.isInteger(age)) return null;
  return age >= 18 && age <= 120 ? age : null;
}

function readNewsletter(raw: unknown): boolean | null {
  if (raw === undefined) return false;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const text = raw.trim().toLowerCase();
    if (text === 'on') return true;
    if (text === 'off') return false;
  }
  return null;
}

/** Valide un formulaire d'inscription en rapportant TOUTES les erreurs, pas seulement la première. */
export function validateSignUp(raw: unknown): Result<SignUp, string> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['formulaire invalide'] };
  }
  const form = raw as Record<string, unknown>;
  const email = readEmail(form.email);
  const age = readAge(form.age);
  const newsletter = readNewsletter(form.newsletter);
  const errors: string[] = [];
  if (email === null) errors.push('email invalide');
  if (age === null) errors.push('âge invalide');
  if (newsletter === null) errors.push('newsletter invalide');
  if (email === null || age === null || newsletter === null) return { ok: false, errors };
  return { ok: true, value: { email, age, newsletter } };
}

/** Applique `f` à la valeur d'un succès ; un échec passe tel quel. */
export function mapResult<T, U, E>(result: Result<T, E>, f: (value: T) => U): Result<U, E> {
  return result.ok ? { ok: true, value: f(result.value) } : result;
}

/** Extrait la valeur ou lève une erreur qui liste toutes les erreurs. */
export function unwrap<T, E>(result: Result<T, E>): T {
  switch (result.ok) {
    case true:
      return result.value;
    case false:
      throw new Error(result.errors.join('; '));
    default:
      return assertUnreachable(result);
  }
}

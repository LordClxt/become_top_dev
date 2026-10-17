// TODO 1 : un tuple de littéraux et FieldName dérivé du tableau.
export const FIELDS = ['email', 'password', 'age', 'newsletter'];
export type FieldName = string;

export type Rule = (value: unknown) => string | null;

// TODO 2 : une règle par champ, vérifiée par satisfies Record<FieldName, Rule>.
export const rules = {};

export interface Signup {
  email: string;
  password: string;
  age: number;
  newsletter?: true;
}

export type ValidationResult =
  | { ok: true; value: Signup }
  | { ok: false; errors: Partial<Record<FieldName, string>> };

// TODO 3 et 4 : valide chaque champ ; construis Signup d'un coup (newsletter seulement si true, email en minuscules).
export function validate(input: Record<string, unknown>) {
  throw new Error('TODO: validate');
}

// TODO 5 : "inscrit : <email>" ou "N erreur(s) : champ1, champ2".
export function summary(result: ValidationResult): string {
  throw new Error('TODO: summary');
}

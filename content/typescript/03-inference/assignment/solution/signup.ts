export const FIELDS = ['email', 'password', 'age', 'newsletter'] as const;
export type FieldName = (typeof FIELDS)[number];

export type Rule = (value: unknown) => string | null;

/** satisfies : chaque règle est vérifiée (et typée par le contexte), les clés restent précises. */
export const rules = {
  email: (v) => (typeof v === 'string' && v.includes('@') ? null : 'e-mail invalide'),
  password: (v) => (typeof v === 'string' && v.length >= 8 ? null : '8 caractères minimum'),
  age: (v) => (typeof v === 'number' && Number.isInteger(v) && v >= 13 && v <= 120 ? null : 'âge invalide'),
  newsletter: (v) => (v === undefined || typeof v === 'boolean' ? null : 'booléen attendu'),
} satisfies Record<FieldName, Rule>;

export interface Signup {
  email: string;
  password: string;
  age: number;
  newsletter?: true;
}

export type ValidationResult =
  | { ok: true; value: Signup }
  | { ok: false; errors: Partial<Record<FieldName, string>> };

export function validate(input: Record<string, unknown>): ValidationResult {
  const errors: Partial<Record<FieldName, string>> = {};
  for (const field of FIELDS) {
    const message = rules[field](input[field]);
    if (message !== null) errors[field] = message;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      // Assertions justifiées : chaque règle vient de vérifier le type de ces valeurs.
      email: (input.email as string).toLowerCase(),
      password: input.password as string,
      age: input.age as number,
      ...(input.newsletter === true ? { newsletter: true } : {}),
    },
  };
}

export function summary(result: ValidationResult): string {
  if (result.ok) return `inscrit : ${result.value.email}`;
  const fields = Object.keys(result.errors);
  return `${fields.length} erreur(s) : ${fields.join(', ')}`;
}

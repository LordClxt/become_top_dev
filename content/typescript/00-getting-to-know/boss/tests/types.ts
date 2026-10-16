import type { Equals, Expect } from './expect.ts';
import { assertUnreachable, mapResult, unwrap, validateSignUp } from './signup.ts';
import type { Result, SignUp } from './signup.ts';

export type Checks = [
  Expect<Equals<SignUp, { email: string; age: number; newsletter: boolean }>>,
  Expect<Equals<ReturnType<typeof validateSignUp>, Result<SignUp, string>>>,
  Expect<Equals<ReturnType<typeof unwrap<SignUp, string>>, SignUp>>,
];

const result = validateSignUp({});
if (result.ok) {
  type Narrowed = Expect<Equals<typeof result.value, SignUp>>;
} else {
  type Narrowed = Expect<Equals<typeof result.errors, readonly string[]>>;
}

// @ts-expect-error `value` n'existe qu'après avoir testé `ok`
result.value;

export const lengths: Result<number, string> = mapResult(validateSignUp({}), (form) => form.email.length);

// @ts-expect-error le résultat de mapResult porte le type de la fonction, pas SignUp
export const wrong: Result<SignUp, string> = mapResult(validateSignUp({}), (form) => form.age);

export function label(r: Result<number, string>): string {
  switch (r.ok) {
    case true:
      return 'ok';
    case false:
      return 'erreur';
    default:
      return assertUnreachable(r);
  }
}

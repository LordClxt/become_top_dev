import type { Equals, Expect } from './expect.ts';
import { rules, validate } from './signup.ts';
import type { FieldName, ValidationResult } from './signup.ts';

export type Checks = [
  Expect<Equals<FieldName, 'email' | 'password' | 'age' | 'newsletter'>>,
  Expect<Equals<keyof typeof rules, FieldName>>,
  Expect<Equals<ReturnType<typeof validate>, ValidationResult>>,
  Expect<Equals<Parameters<typeof rules.email>[0], unknown>>,
];

const r = validate({});
if (r.ok) {
  const email: string = r.value.email;
  void email;
  // @ts-expect-error pas d'erreurs dans la branche ok
  void r.errors;
}

import type { Equals, Expect } from './expect.ts';
import { discriminatedUnion, isoDate, nullable, number, object, string } from './parse.ts';
import type { Infer } from './parse.ts';

const shape = discriminatedUnion('kind', { circle: { radius: number() }, rect: { w: number(), h: number() } });
const person = object({ name: string(), middle: nullable(string()), born: isoDate() });

export type Checks = [
  Expect<Equals<Infer<typeof shape>, { kind: 'circle'; radius: number } | { kind: 'rect'; w: number; h: number }>>,
  Expect<Equals<Infer<typeof person>, { name: string; middle: string | null; born: Date }>>,
];

const s = shape.parse({});
if (s.kind === 'circle') {
  const r: number = s.radius;
  void r;
  // @ts-expect-error un cercle n'a pas de largeur
  void s.w;
}

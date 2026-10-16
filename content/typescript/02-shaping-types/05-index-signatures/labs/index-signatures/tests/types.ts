import type { Equals, Expect } from './expect.ts';
import { addVec, first, parseCSV, sumAll, toRocket } from './csv.ts';
import type { Rocket, Row, Vec3D } from './csv.ts';

export type Checks = [
  Expect<Equals<Row, Map<string, string>>>,
  Expect<Equals<Rocket, { name: string; variant: string; thrustKn: number }>>,
  Expect<Equals<Vec3D, Record<'x' | 'y' | 'z', number>>>,
  Expect<Equals<Parameters<typeof sumAll>[0], Iterable<number>>>,
  Expect<Equals<ReturnType<typeof first<string>>, string | undefined>>,
  Expect<Equals<ReturnType<typeof parseCSV>, Row[]>>,
];

export const total = sumAll(new Set([1, 2, 3]));
export const fromGenerator = sumAll((function* () { yield 1; yield 2; })());
export const letter = first('abc');
export const v: Vec3D = addVec({ x: 1, y: 2, z: 3 }, { x: 1, y: 1, z: 1 });

// @ts-expect-error il manque z
addVec({ x: 1, y: 2 }, { x: 1, y: 1, z: 1 });
// @ts-expect-error w n'est pas une clé de Vec3D
export const w: Vec3D = { x: 1, y: 2, z: 3, w: 4 };
// @ts-expect-error thrustKn est un nombre
export const r: Rocket = { name: 'Falcon 9', variant: 'v1.0', thrustKn: '4940' };

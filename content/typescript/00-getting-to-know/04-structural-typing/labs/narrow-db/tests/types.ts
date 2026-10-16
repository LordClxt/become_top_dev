import type { Equals, Expect } from './expect.ts';
import { getAuthors, length } from './authors.ts';
import type { QueryRunner, Vector2D, Vector3D } from './authors.ts';

export type Checks = [
  Expect<Equals<Parameters<typeof getAuthors>, [db: QueryRunner]>>,
  Expect<Equals<keyof QueryRunner, 'runQuery'>>,
  Expect<Equals<ReturnType<typeof getAuthors>, Promise<string[]>>>,
];

// Structurel : un objet littéral de la bonne forme est accepté, sans classe ni mock.
export const run1 = getAuthors({ runQuery: async () => [] });

// Un vecteur nommé (variable, donc pas de contrôle de propriétés en trop) est un Vector2D valide.
const named = { name: 'v', x: 3, y: 4 };
export const l2 = length(named);
const v3: Vector3D = { x: 1, y: 2, z: 2 };
export const l3 = length(v3);
export const asV2: Vector2D = v3;

// @ts-expect-error un objet sans runQuery n'est pas un QueryRunner
getAuthors({});

/**
 * Mini harnais de test sans dépendance : chaque test affiche des lignes JSON au format de
 * `go test -json`, que la plateforme sait lire. Copié tel quel dans le dossier tests/ de chaque
 * TP TypeScript (source de vérité : sandbox/images/typescript/spec.ts).
 *
 *   import { test, eq, check, raises, run } from './spec.ts';   // test.ts, à côté du code testé
 *   test('nom', () => { eq(f(1), 2, 'f(1)'); });
 *   await run();
 */
import { isDeepStrictEqual, inspect } from 'node:util';

/** Échec d'une vérification : le message est montré tel quel à l'apprenant. */
export class Failure extends Error {}

type Body = () => unknown | Promise<unknown>;
const tests: { name: string; body: Body }[] = [];

/** Déclare un test (synchrone ou async). Les tests tournent dans l'ordre, à l'appel de run(). */
export function test(name: string, body: Body): void {
  tests.push({ name, body });
}

/** Vérifie une condition ; `message` explique ce qui est attendu. */
export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Failure(message);
}

/** Égalité profonde (isDeepStrictEqual) avec affichage obtenu / attendu. */
export function eq(actual: unknown, expected: unknown, what: string): void {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Failure(`${what} : obtenu ${show(actual)}, attendu ${show(expected)}`);
  }
}

/** Vérifie que `body` lève (ou rejette avec) une erreur, éventuellement d'une classe donnée, et la renvoie. */
export async function raises<E extends Error = Error>(
  body: Body, what: string, type?: abstract new (...args: never[]) => E,
): Promise<E> {
  try {
    await body();
  } catch (e) {
    if (isTodo(e)) throw new Failure(`pas encore implémenté (${(e as Error).message})`);
    if (!type || e instanceof type) return e as E;
    throw new Failure(`${what} : attendu ${type.name}, obtenu ${describe(e)}`);
  }
  throw new Failure(`${what} : attendu ${type ? type.name : 'une erreur'}, mais rien n'a été levé`);
}

/** Lance les tests (filtrés par les préfixes passés en arguments) puis fixe le code de sortie. */
export async function run(): Promise<void> {
  const prefixes = process.argv.slice(2);
  let failures = 0;
  for (const { name, body } of tests) {
    if (prefixes.length > 0 && !prefixes.some((p) => name.startsWith(p))) continue;
    let problem: string | null = null;
    try {
      await body();
    } catch (e) {
      problem = e instanceof Failure ? e.message
        : isTodo(e) ? `pas encore implémenté (${(e as Error).message})`
        : describe(e);
    }
    if (problem !== null) {
      failures++;
      emit('output', name, problem + '\n');
    }
    emit(problem === null ? 'pass' : 'fail', name);
  }
  process.exitCode = failures === 0 ? 0 : 1;
}

/** Les starters lèvent `new Error('TODO: …')` : le message est montré comme « pas encore implémenté ». */
function isTodo(e: unknown): boolean {
  return e instanceof Error && e.message.startsWith('TODO');
}

function describe(e: unknown): string {
  if (!(e instanceof Error)) return `valeur levée : ${show(e)}`;
  const where = (e.stack ?? '').split('\n')
    .map((l) => /\/work\/([^:)]+):(\d+)/.exec(l))
    .find((m) => m && !m[1]!.endsWith('spec.ts'));
  return `${e.name}: ${e.message}${where ? ` (${where[1]}:${where[2]})` : ''}`;
}

function show(v: unknown): string {
  return inspect(v, { depth: 6, breakLength: Infinity });
}

function emit(action: string, test: string, output?: string): void {
  console.log(JSON.stringify(output === undefined ? { Action: action, Test: test } : { Action: action, Test: test, Output: output }));
}

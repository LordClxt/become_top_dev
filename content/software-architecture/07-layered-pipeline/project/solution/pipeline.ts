/**
 * archkit — pipes and filters sur des itérables asynchrones.
 *
 * Un filtre transforme un flux en un autre flux. Les filtres sont paresseux : rien n'est lu
 * tant que le consommateur ne le demande pas, et s'arrêter tôt referme les filtres en amont.
 */

export type Filter<I, O> = (input: AsyncIterable<I>) => AsyncIterable<O>;

/** Fourni : un producteur à partir d'une collection. */
export async function* fromIterable<T>(items: Iterable<T>): AsyncIterable<T> {
  for (const x of items) yield x;
}

// ---------- Jalon 1 : les quatre types de filtres ----------

/** Transformateur (map). */
export function map<I, O>(f: (x: I) => O | Promise<O>): Filter<I, O> {
  return async function* (input) {
    for await (const x of input) yield await f(x);
  };
}

/** Testeur : ne laisse passer que ce qui satisfait le prédicat. */
export function keep<I>(pred: (x: I) => boolean): Filter<I, I> {
  return async function* (input) {
    for await (const x of input) if (pred(x)) yield x;
  };
}

/** Ne laisse passer que les n premiers éléments, puis arrête de lire l'amont. */
export function take<T>(n: number): Filter<T, T> {
  return async function* (input) {
    if (n <= 0) return;
    let i = 0;
    for await (const x of input) {
      yield x;
      if (++i >= n) return;
    }
  };
}

/** Enchaîne des filtres de gauche à droite. */
export function compose(...filters: Filter<any, any>[]): Filter<any, any> {
  return (input) => filters.reduce((acc, f) => f(acc), input);
}

/** Consommateur : lit tout le flux. */
export async function collect<T>(input: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of input) out.push(x);
  return out;
}

// ---------- Jalon 2 : aiguillage et lots ----------

export interface Route<I, O> {
  when: (x: I) => boolean;
  then: (x: I) => O;
}

/** Testeurs en cascade : la première route dont `when` est vrai transforme l'élément ; sans route, il est écarté (et signalé). */
export function dispatch<I, O>(routes: Route<I, O>[], onDrop?: (x: I) => void): Filter<I, O> {
  return async function* (input) {
    for await (const x of input) {
      const r = routes.find((route) => route.when(x));
      if (r) yield r.then(x);
      else onDrop?.(x);
    }
  };
}

/** Regroupe en lots de `size` (le dernier lot peut être plus petit). */
export function batch<T>(size: number): Filter<T, T[]> {
  return async function* (input) {
    let current: T[] = [];
    for await (const x of input) {
      current.push(x);
      if (current.length === size) { yield current; current = []; }
    }
    if (current.length > 0) yield current;
  };
}

// ---------- Jalon 3 : le pipeline de McIlroy ----------

/** tr -cs A-Za-z '\n' : un mot (suite de lettres ASCII) par élément. */
export function words(): Filter<string, string> {
  return async function* (input) {
    for await (const text of input) yield* text.split(/[^A-Za-z]+/).filter((w) => w.length > 0);
  };
}

/** tr A-Z a-z */
export function lowercase(): Filter<string, string> {
  return map((w: string) => w.toLowerCase());
}

/** sort | uniq -c | sort -rn : [mot, fréquence] par fréquence décroissante, puis ordre alphabétique. */
export function countSorted(): Filter<string, [string, number]> {
  return async function* (input) {
    const counts = new Map<string, number>();
    for await (const w of input) counts.set(w, (counts.get(w) ?? 0) + 1);
    yield* [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
}

/** Le pipeline complet de McIlroy : les n mots les plus fréquents. */
export function topWords(n: number): Filter<string, [string, number]> {
  return compose(words(), lowercase(), countSorted(), take(n));
}

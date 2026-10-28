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
  throw new Error('TODO: map');
}

/** Testeur : ne laisse passer que ce qui satisfait le prédicat. */
export function keep<I>(pred: (x: I) => boolean): Filter<I, I> {
  throw new Error('TODO: keep');
}

/** Ne laisse passer que les n premiers éléments, puis arrête de lire l'amont. */
export function take<T>(n: number): Filter<T, T> {
  throw new Error('TODO: take');
}

/** Enchaîne des filtres de gauche à droite. */
export function compose(...filters: Filter<any, any>[]): Filter<any, any> {
  throw new Error('TODO: compose');
}

/** Consommateur : lit tout le flux. */
export async function collect<T>(input: AsyncIterable<T>): Promise<T[]> {
  throw new Error('TODO: collect');
}

// ---------- Jalon 2 : aiguillage et lots ----------

export interface Route<I, O> {
  when: (x: I) => boolean;
  then: (x: I) => O;
}

/** Testeurs en cascade : la première route dont `when` est vrai transforme l'élément ; sans route, il est écarté (et signalé). */
export function dispatch<I, O>(routes: Route<I, O>[], onDrop?: (x: I) => void): Filter<I, O> {
  throw new Error('TODO: dispatch');
}

/** Regroupe en lots de `size` (le dernier lot peut être plus petit). */
export function batch<T>(size: number): Filter<T, T[]> {
  throw new Error('TODO: batch');
}

// ---------- Jalon 3 : le pipeline de McIlroy ----------

/** tr -cs A-Za-z '\n' : un mot (suite de lettres ASCII) par élément. */
export function words(): Filter<string, string> {
  throw new Error('TODO: words');
}

/** tr A-Z a-z */
export function lowercase(): Filter<string, string> {
  throw new Error('TODO: lowercase');
}

/** sort | uniq -c | sort -rn : [mot, fréquence] par fréquence décroissante, puis ordre alphabétique. */
export function countSorted(): Filter<string, [string, number]> {
  throw new Error('TODO: countSorted');
}

/** Le pipeline complet de McIlroy : les n mots les plus fréquents. */
export function topWords(n: number): Filter<string, [string, number]> {
  throw new Error('TODO: topWords');
}

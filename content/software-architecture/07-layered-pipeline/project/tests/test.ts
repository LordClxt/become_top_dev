import { check, eq, run, test } from './spec.ts';
import { batch, collect, compose, countSorted, dispatch, fromIterable, keep, lowercase, map, take, topWords, words } from './pipeline.ts';

/** Producteur instrumenté : compte les éléments demandés et note s'il a été refermé. */
function counted<T>(items: Iterable<T>) {
  const stats = { pulled: 0, closed: false };
  async function* gen() {
    try { for (const x of items) { stats.pulled++; yield x; } } finally { stats.closed = true; }
  }
  return { source: gen(), stats };
}
function* naturals() { for (let i = 1; ; i++) yield i; }

// ---------- Jalon 1 ----------

test('M1 transformateur, testeur, consommateur', async () => {
  const out = await collect(compose(map((x: number) => x * 10), keep((x: number) => x > 20))(fromIterable([1, 2, 3, 4])));
  eq(out, [30, 40], 'pipeline ×10 puis > 20');
  eq(await collect(compose()(fromIterable(['a']))), ['a'], 'compose() sans filtre laisse passer');
  eq(await collect(map(async (x: number) => x + 1)(fromIterable([1, 2]))), [2, 3], 'un transformateur asynchrone');
});

test('M1 l’ordre des filtres compte', async () => {
  const a = await collect(compose(take(2), map((x: number) => x * 2))(fromIterable([5, 6, 7])));
  const b = await collect(compose(keep((x: number) => x % 2 === 1), take(2))(fromIterable([1, 2, 3, 4, 5])));
  eq([a, b], [[10, 12], [1, 3]], '[take puis map, keep puis take]');
  eq(await collect(take(0)(fromIterable([1]))), [], 'take(0)');
});

test('M1 paresse : take arrête de lire et referme l’amont', async () => {
  const { source, stats } = counted(naturals());
  const out = await collect(compose(map((x: number) => x * x), take(3))(source));
  eq(out, [1, 4, 9], 'premiers carrés d’un producteur infini');
  check(stats.pulled === 3, `le producteur ne doit fournir que 3 éléments, il en a fourni ${stats.pulled}`);
  check(stats.closed, 'le producteur doit être refermé (son finally exécuté) quand l’aval s’arrête');
});

// ---------- Jalon 2 ----------

type Metric = { kind: string; ms?: number; up?: boolean };

test('M2 dispatch : la télémétrie du livre', async () => {
  const dropped: Metric[] = [];
  const telemetry = dispatch<Metric, string>([
    { when: (m) => m.kind === 'duration', then: (m) => `duration:${m.ms}` },
    { when: (m) => m.kind === 'uptime', then: (m) => `uptime:${m.up ? 1 : 0}` },
  ], (m) => dropped.push(m));
  const input: Metric[] = [{ kind: 'duration', ms: 42 }, { kind: 'cpu' }, { kind: 'uptime', up: true }, { kind: 'duration', ms: 7 }];
  eq(await collect(telemetry(fromIterable(input))), ['duration:42', 'uptime:1', 'duration:7'], 'sortie (ordre conservé)');
  eq(dropped, [{ kind: 'cpu' }], 'éléments sans route');
});

test('M2 étendre sans modifier : une route de plus', async () => {
  const base = [
    { when: (m: Metric) => m.kind === 'duration', then: (m: Metric) => `duration:${m.ms}` },
    { when: (m: Metric) => m.kind === 'uptime', then: () => 'uptime' },
  ];
  const extended = [...base, { when: (m: Metric) => m.kind === 'db-wait', then: (m: Metric) => `db-wait:${m.ms}` }];
  const input: Metric[] = [{ kind: 'db-wait', ms: 3 }, { kind: 'duration', ms: 1 }];
  eq(await collect(dispatch(extended)(fromIterable(input))), ['db-wait:3', 'duration:1'], 'avec la nouvelle route');
  eq(await collect(dispatch(base)(fromIterable(input))), ['duration:1'], 'sans elle (et sans onDrop)');
});

test('M2 la première route qui correspond gagne', async () => {
  const f = dispatch<number, string>([
    { when: (x) => x > 10, then: () => 'grand' },
    { when: (x) => x > 0, then: () => 'positif' },
  ]);
  eq(await collect(f(fromIterable([50, 5, -1]))), ['grand', 'positif'], 'sortie');
});

test('M2 lots pour le consommateur', async () => {
  eq(await collect(batch<number>(2)(fromIterable([1, 2, 3, 4, 5]))), [[1, 2], [3, 4], [5]], 'lots de 2');
  eq(await collect(batch<number>(3)(fromIterable([]))), [], 'flux vide');
});

// ---------- Jalon 3 ----------

test('M3 les filtres de McIlroy un par un', async () => {
  eq(await collect(words()(fromIterable(["It's a pipe-and-filter world", '  42 pipes! '])) ), ['It', 's', 'a', 'pipe', 'and', 'filter', 'world', 'pipes'], 'words (tr -cs A-Za-z)');
  eq(await collect(lowercase()(fromIterable(['UNIX', 'Shell']))), ['unix', 'shell'], 'lowercase');
  eq(await collect(countSorted()(fromIterable(['b', 'a', 'b', 'c', 'a', 'b']))), [['b', 3], ['a', 2], ['c', 1]], 'countSorted');
  eq(await collect(countSorted()(fromIterable(['z', 'y', 'x']))), [['x', 1], ['y', 1], ['z', 1]], 'à fréquence égale, ordre alphabétique');
});

test('M3 topWords : les n mots les plus fréquents', async () => {
  const text = ['The pipe and the filter.', 'A pipe, a FILTER, a pipe!', 'the end'];
  eq(await collect(topWords(3)(fromIterable(text))), [['a', 3], ['pipe', 3], ['the', 3]], 'top 3');
  eq(await collect(topWords(1)(fromIterable(['solo']))), [['solo', 1]], 'top 1');
});

await run();

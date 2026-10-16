import { check, eq, raises, run, test } from './spec.ts';
import {
  checkFencing, commitWait, declaredDead, FailureDetector, FencedStorage, Lamport, LockService, majority, newerLWW,
  overlaps, before, StaleTokenError, timeoutBound, TrueTime, type Interval, type LWWValue,
} from './trouble.ts';

const beats = (d: FailureDetector, ...times: number[]) => times.forEach((t) => d.heartbeat(t));

// ---------- Jalon 1 ----------

test('M1 timeoutBound', () => {
  eq(timeoutBound(10, 5), 25, 'timeoutBound(10, 5) (2d + r)');
});

test('M1 sans battement, pas de soupçon', () => {
  const d = new FailureDetector(10, 3, 50);
  eq(d.suspected(1_000_000), false, 'sans aucun battement reçu, on ne soupçonne personne');
  eq(d.timeout(), 50, 'timeout sans historique (le minimum)');
});

test('M1 battements réguliers', () => {
  const d = new FailureDetector(10, 3, 50);
  beats(d, 0, 100, 200, 300);
  eq(d.timeout(), 100, 'intervalles de 100 ms réguliers');
  eq(d.suspected(400), false, '100 ms depuis le dernier battement : pas encore au-delà du délai');
  eq(d.suspected(401), true, '101 ms sans battement avec un délai de 100 : soupçonné');
});

test('M1 le délai s’adapte à la gigue', () => {
  const d = new FailureDetector(10, 2, 50);
  beats(d, 0, 100, 300, 400, 600); // intervalles 100, 200, 100, 200
  eq(d.timeout(), 250, 'moyenne 150 + 2 × écart-type 50');
});

test('M1 la fenêtre oublie les vieux intervalles', () => {
  const d = new FailureDetector(3, 3, 10);
  beats(d, 0, 1000, 1100, 1200, 1300); // un intervalle de 1000, puis 100 100 100
  eq(d.timeout(), 100, 'seuls les 3 derniers intervalles comptent');
});

test('M1 jamais sous le minimum', () => {
  const d = new FailureDetector(10, 3, 500);
  beats(d, 0, 10, 20, 30);
  eq(d.timeout(), 500, 'timeout (le minimum)');
});

test('M1 pause puis réveil', () => {
  const d = new FailureDetector(10, 3, 50);
  beats(d, 0, 100, 200, 300);
  eq(d.suspected(1100), true, 'une pause de 800 ms (GC) dépasse le délai de 100 ms : soupçonné à tort');
  d.heartbeat(1150);
  eq(d.suspected(1200), false, 'après un nouveau battement, le soupçon est levé');
  check(d.timeout() > 100, `la pause a élargi les intervalles : le délai doit augmenter (${d.timeout()})`);
});

// ---------- Jalon 2 ----------

test('M2 Lamport ordonne les événements causaux', () => {
  const a = new Lamport(), b = new Lamport();
  eq([a.tick(), a.tick()], [1, 2], 'tick incrémente de 1');
  const sent = a.tick(); // 3
  eq(b.receive(sent), 4, 'receive(3) sur une horloge à 0 (max + 1)');
  eq(b.receive(1), 5, 'recevoir un horodatage plus ancien n’avance que d’un cran');
});

test('M2 les horodatages physiques perdent une écriture causalement postérieure', () => {
  // figure 8-3 : l'horloge du nœud 1 avance ; l'incrément de B, causalement postérieur, a un horodatage plus petit
  const a: LWWValue = { value: 'x=1', ts: 42004, node: 'n1' };
  const b: LWWValue = { value: 'x=2', ts: 42003, node: 'n3' };
  eq(newerLWW(a, b).value, 'x=1', 'LWW avec horodatages physiques garde x=1 : l’incrément de B est perdu');
  eq(newerLWW(b, a).value, 'x=1', 'newerLWW doit être symétrique');
});

test('M2 Lamport préserve la causalité', () => {
  const n1 = new Lamport(), n3 = new Lamport();
  const write: LWWValue = { value: 'x=1', ts: n1.tick(), node: 'n1' };
  n3.receive(write.ts); // n3 reçoit la réplication de x=1
  const incr: LWWValue = { value: 'x=2', ts: n3.tick(), node: 'n3' };
  eq(newerLWW(write, incr).value, 'x=2', 'avec une horloge logique, l’écriture causalement postérieure gagne');
});

test('M2 à égalité, le plus grand nœud gagne', () => {
  const a: LWWValue = { value: 'a', ts: 7, node: 'n1' };
  const b: LWWValue = { value: 'b', ts: 7, node: 'n2' };
  eq([newerLWW(a, b).value, newerLWW(b, a).value], ['b', 'b'], 'à horodatage égal, quel que soit l’ordre des arguments');
});

test('M2 intervalles', () => {
  const a: Interval = { earliest: 10, latest: 20 };
  const b: Interval = { earliest: 21, latest: 30 };
  const c: Interval = { earliest: 15, latest: 25 };
  eq([before(a, b), before(b, a)], [true, false], '[10,20] est sûrement avant [21,30]');
  eq([before(a, c), before(c, a), overlaps(a, c), overlaps(c, a)], [false, false, true, true], '[10,20] et [15,25] se chevauchent');
  eq(overlaps(a, b), false, 'pas de chevauchement');
  eq(before({ earliest: 10, latest: 20 }, { earliest: 20, latest: 30 }), false, 'un intervalle qui touche l’autre ne permet pas de conclure');
});

test('M2 TrueTime', () => {
  const tt = new TrueTime(() => 1000, 7);
  eq(tt.now(), { earliest: 993, latest: 1007 }, 'now()');
  eq([tt.after(1000), tt.after(992)], [false, true], 'after(ts) est vrai quand earliest > ts');
});

test('M2 commitWait sépare les transactions', () => {
  let now = 1000, slept = 0;
  const tt = new TrueTime(() => now, 7);
  const ts = commitWait(tt, (ms) => { now += ms; slept += ms; });
  eq(ts, 1007, 'horodatage de validation (now().latest)');
  eq(slept, 15, 'attente en ms (jusqu’à ce que earliest dépasse 1007, soit 2 × eps + 1)');
  check(before({ earliest: ts, latest: ts }, tt.now()), `l’intervalle suivant ${JSON.stringify(tt.now())} doit être strictement après ts = ${ts}`);
});

// ---------- Jalon 3 ----------

test('M3 bail et jetons', () => {
  const ls = new LockService(30, 33);
  eq(ls.acquire('c1', 0), 33, 'premier octroi');
  eq(ls.acquire('c2', 10), undefined, 'le bail de c1 court jusqu’à 30 : c2 est refusé');
  eq(ls.acquire('c1', 20), 33, 'renouvellement : le même jeton');
  eq(ls.acquire('c2', 49), undefined, 'le renouvellement a prolongé le bail jusqu’à 50');
  eq(ls.acquire('c2', 50), 34, 'après expiration, c2 reçoit un jeton plus grand');
  eq([ls.valid('c1', 33, 51), ls.valid('c2', 34, 51)], [false, true], 'valid : c1 n’a plus le bail, c2 l’a');
  eq(ls.valid('c2', 34, 80), false, 'le bail de c2 a expiré à 80');
});

test('M3 la clôture rejette un client en pause', async () => {
  const ls = new LockService(30, 33);
  const store = new FencedStorage();
  const tok1 = ls.acquire('c1', 0)!;
  // c1 se fige (pause GC) ; son bail expire ; c2 prend le relais
  const tok2 = ls.acquire('c2', 40)!;
  eq(tok2, 34, 'jeton de c2');
  store.write(tok2, 'écrit par c2');
  eq(ls.valid('c1', tok1, 45), false, 'c1 n’a plus de bail valide, même s’il l’ignore');
  // c1 se réveille, croit toujours détenir le bail et écrit avec son vieux jeton
  await raises(() => store.write(tok1, 'écrit par c1'), 'écriture avec le jeton 33 après le 34', StaleTokenError);
  eq(store.data, 'écrit par c2', 'l’écriture périmée ne doit rien changer');
  store.write(tok2, 'encore c2'); // le même jeton peut écrire plusieurs fois
});

test('M3 le quorum décide', () => {
  for (const [n, want] of [[1, 1], [2, 2], [3, 2], [4, 3], [5, 3], [7, 4]] as const) eq(majority(n), want, `majority(${n})`);
  eq([declaredDead(2, 3), declaredDead(1, 3), declaredDead(3, 5), declaredDead(2, 5), declaredDead(2, 4)],
    [true, false, true, false, false], 'un nœud est déclaré mort quand une majorité stricte le dit');
});

test('M3 propriétés de sûreté des jetons', async () => {
  checkFencing([33, 34, 35]);
  checkFencing([]);
  await raises(() => checkFencing([33, 34, 33]), 'un jeton accordé deux fois viole l’unicité');
  await raises(() => checkFencing([34, 33]), 'une suite décroissante viole la propriété de croissance');
});

await run();

/**
 * Modèle pur du scheduler de Go (G, M, P), réduit à ce que la vidéo montre.
 * Chaque opération suit le runtime (runtime/proc.go) :
 * - `go f()` : la nouvelle G prend runnext du P courant ; l'ancienne runnext passe en fin de file locale (runqput).
 * - un P choisit runnext, puis sa file locale, puis la file globale, puis vole (findRunnable).
 * - un vol prend la moitié de la file de la victime, arrondie au supérieur, et exécute la dernière G volée (runqsteal).
 * - une G préemptée après sa tranche de 10 ms part dans la file globale (gopreempt_m → globrunqput).
 * - une G bloquée est garée hors de tout P (gopark) ; réveillée, elle prend runnext du P qui la réveille (goready).
 */

export type GId = number

export type Proc = { running: GId | null; runnext: GId | null; local: GId[] }

export type SchedState = {
  procs: Proc[]
  global: GId[]
  parked: GId[]
  done: GId[]
  /** Toutes les G créées, dans l'ordre de création. */
  created: GId[]
}

export type Place =
  | { kind: 'run'; p: number }
  | { kind: 'next'; p: number }
  | { kind: 'local'; p: number; i: number }
  | { kind: 'global'; i: number }
  | { kind: 'parked'; i: number }
  | { kind: 'done'; i: number }

const clone = (s: SchedState): SchedState => ({
  procs: s.procs.map((p) => ({ ...p, local: [...p.local] })),
  global: [...s.global],
  parked: [...s.parked],
  done: [...s.done],
  created: [...s.created],
})

export function boot(procs: number): SchedState {
  const s: SchedState = {
    procs: Array.from({ length: procs }, () => ({ running: null, runnext: null, local: [] })),
    global: [],
    parked: [],
    done: [],
    created: [1],
  }
  s.procs[0]!.running = 1 // main
  return s
}

function putNext(p: Proc, g: GId) {
  if (p.runnext !== null) p.local.push(p.runnext)
  p.runnext = g
}

/** `go f()` exécuté par la G qui tourne sur P `p`. */
export function spawn(s: SchedState, p: number, g: GId): SchedState {
  const n = clone(s)
  n.created.push(g)
  putNext(n.procs[p]!, g)
  return n
}

/** Le P `p` est libre : il prend runnext, puis sa file locale, puis la file globale. */
export function schedule(s: SchedState, p: number): SchedState {
  const n = clone(s)
  const proc = n.procs[p]!
  if (proc.running !== null) throw new Error(`P${p} exécute déjà G${proc.running}`)
  if (proc.runnext !== null) {
    proc.running = proc.runnext
    proc.runnext = null
  } else if (proc.local.length > 0) {
    proc.running = proc.local.shift()!
  } else if (n.global.length > 0) {
    proc.running = n.global.shift()!
  } else {
    throw new Error(`P${p} n'a rien à exécuter`)
  }
  return n
}

/** Le P `thief`, à vide, vole la moitié (arrondie au supérieur) de la file locale de `victim` et exécute la dernière. */
export function steal(s: SchedState, thief: number, victim: number): SchedState {
  const n = clone(s)
  const t = n.procs[thief]!
  const v = n.procs[victim]!
  if (t.running !== null || t.runnext !== null || t.local.length > 0) throw new Error(`P${thief} n'est pas à vide`)
  const count = v.local.length - Math.floor(v.local.length / 2)
  if (count === 0) throw new Error(`rien à voler sur P${victim}`)
  const stolen = v.local.splice(0, count)
  t.running = stolen.pop()!
  t.local.push(...stolen)
  return n
}

/** La G de `p` se bloque (canal, WaitGroup…) : elle est garée et libère le P. */
export function park(s: SchedState, p: number): SchedState {
  const n = clone(s)
  const proc = n.procs[p]!
  if (proc.running === null) throw new Error(`P${p} n'exécute rien`)
  n.parked.push(proc.running)
  proc.running = null
  return n
}

/** La G de `p` réveille la G garée `g`, qui prend runnext de `p`. */
export function ready(s: SchedState, p: number, g: GId): SchedState {
  const n = clone(s)
  const at = n.parked.indexOf(g)
  if (at === -1) throw new Error(`G${g} n'est pas garée`)
  n.parked.splice(at, 1)
  putNext(n.procs[p]!, g)
  return n
}

/** Tranche de temps écoulée : la G de `p` part en fin de file globale. */
export function preempt(s: SchedState, p: number): SchedState {
  const n = clone(s)
  const proc = n.procs[p]!
  if (proc.running === null) throw new Error(`P${p} n'exécute rien`)
  n.global.push(proc.running)
  proc.running = null
  return n
}

/** La G de `p` se termine. */
export function exit(s: SchedState, p: number): SchedState {
  const n = clone(s)
  const proc = n.procs[p]!
  if (proc.running === null) throw new Error(`P${p} n'exécute rien`)
  n.done.push(proc.running)
  proc.running = null
  return n
}

export function placeOf(s: SchedState, g: GId): Place | null {
  for (const [p, proc] of s.procs.entries()) {
    if (proc.running === g) return { kind: 'run', p }
    if (proc.runnext === g) return { kind: 'next', p }
    const i = proc.local.indexOf(g)
    if (i !== -1) return { kind: 'local', p, i }
  }
  for (const [kind, list] of [
    ['global', s.global],
    ['parked', s.parked],
    ['done', s.done],
  ] as const) {
    const i = list.indexOf(g)
    if (i !== -1) return { kind, i }
  }
  return null
}

// --- Le scénario ------------------------------------------------------------------

export const PROGRAM = [
  'func main() {',
  '    var wg sync.WaitGroup',
  '    for i := range 4 {',
  '        wg.Add(1)',
  '        go func() {',
  '            defer wg.Done()',
  '            work(i)',
  '        }()',
  '    }',
  '    wg.Wait()',
  '}',
]

export type Step = {
  state: SchedState
  /** Ligne de PROGRAM en cours sur P0 (index), ou null. */
  line: number | null
  title: string
  detail: string
}

/** GOMAXPROCS=2 : main crée quatre goroutines (G2 à G5) puis attend qu'elles finissent. */
export function scenario(): Step[] {
  const steps: Step[] = []
  let s = boot(2)
  const add = (next: SchedState, line: number | null, title: string, detail: string) => {
    s = next
    steps.push({ state: s, line, title, detail })
  }

  add(s, 0, 'main démarre sur P0', 'GOMAXPROCS=2 : deux P, chacun avec sa propre file. P1 n’a encore rien à faire.')
  add(spawn(s, 0, 2), 4, 'go func() crée G2', 'Une goroutine neuve va dans runnext de P0 : la place prioritaire, pas la file.')
  add(spawn(s, 0, 3), 4, 'go func() crée G3', 'G3 prend runnext. G2 recule en fin de file locale.')
  add(steal(s, 1, 0), 4, 'P1 vole du travail', 'P1 était à vide : il prend la moitié de la file de P0, soit G2, et l’exécute.')
  add(spawn(s, 0, 4), 4, 'go func() crée G4', 'G4 prend runnext, G3 passe dans la file locale.')
  add(spawn(s, 0, 5), 4, 'go func() crée G5', 'G5 prend runnext, G4 suit G3 dans la file locale.')
  add(park(s, 0), 9, 'wg.Wait() bloque main', 'G1 est garée : elle attend sans occuper de P ni de thread.')
  add(schedule(s, 0), null, 'P0 reprend runnext', 'runnext passe avant la file : la dernière goroutine créée, G5, tourne en premier.')
  add(exit(s, 1), null, 'G2 se termine', 'wg.Done() décrémente le compteur. P1 est de nouveau à vide.')
  add(steal(s, 1, 0), null, 'P1 vole encore', 'File de P0 : G3 et G4. P1 en prend la moitié, G3, et l’exécute.')
  add(preempt(s, 0), null, 'G5 est préemptée', 'Après 10 ms sans rendre la main, G5 est interrompue et part dans la file globale.')
  add(schedule(s, 0), null, 'P0 prend sa file locale', 'runnext est vide : P0 exécute G4, en tête de sa file.')
  add(exit(s, 1), null, 'G3 se termine', 'P1 n’a plus rien en local.')
  add(schedule(s, 1), null, 'P1 lit la file globale', 'File locale vide : P1 reprend G5 depuis la file globale.')
  add(exit(s, 0), null, 'G4 se termine', 'P0 n’a plus rien et rien à voler : il reste inactif.')
  add(ready(s, 1, 1), null, 'Le dernier wg.Done() réveille main', 'Le compteur tombe à zéro : G1 sort de l’attente et prend runnext de P1.')
  add(exit(s, 1), null, 'G5 se termine', 'P1 se libère.')
  add(schedule(s, 1), 9, 'main reprend sur P1', 'G1 continue là où elle s’était arrêtée, sur un autre P qu’au départ.')
  add(exit(s, 1), 10, 'main se termine', 'Le programme s’arrête : cinq goroutines se sont partagé deux P.')
  return steps
}

import type { Step } from '../../../../_shared/trace'

/**
 * Fan-out / fan-in : une source envoie des jobs dans un channel `in`, trois workers les prennent dès qu'ils sont libres
 * (fan-out), et chacun écrit son résultat dans un seul channel `out` (fan-in). Les durées des jobs diffèrent, donc
 * les résultats sortent dans l'ordre de fin, pas dans l'ordre d'entrée. Le modèle est un simulateur à pas de temps.
 */
export const DURATION: Record<number, number> = { 1: 3, 2: 1, 3: 2, 4: 1, 5: 3, 6: 1 }
export type Worker = { job: number | null; left: number }
export type State = { queue: number[]; workers: Worker[]; out: number[]; closed: boolean }

export const PROGRAM = [
  'in  := source(1, 2, 3, 4, 5, 6)',
  'out := make(chan int)',
  'for i := 0; i < 3; i++ {',
  '    go worker(in, out)   // fan-out',
  '}',
  'go func() { wg.Wait(); close(out) }()',
  'for r := range out { ... } // fan-in',
]

export function scenario(): Step<State>[] {
  let s: State = { queue: [1, 2, 3, 4, 5, 6], workers: [{ job: null, left: 0 }, { job: null, left: 0 }, { job: null, left: 0 }], out: [], closed: false }
  const steps: Step<State>[] = [
    { title: 'Six jobs dans le channel in', detail: 'La source les a déposés dans l’ordre 1 à 6. Trois workers sont prêts à les prendre.', state: s, line: 0 },
  ]
  for (let tick = 1; tick <= 5; tick++) {
    // Les workers libres prennent les jobs suivants.
    const queue = [...s.queue]
    const workers = s.workers.map((w) => {
      if (w.job === null && queue.length > 0) {
        const job = queue.shift()!
        return { job, left: DURATION[job]! }
      }
      return { ...w }
    })
    const taken = workers.map((w, i) => (w.job !== null && s.workers[i]!.job === null ? w.job : null)).filter((j) => j !== null)
    const shown: State = { ...s, queue, workers }
    steps.push({
      title: tick === 1 ? 'Fan-out : chaque worker prend un job' : `Tick ${tick}`,
      detail:
        tick === 1
          ? 'Les trois workers lisent in en même temps : chacun reçoit un job différent (1, 2, 3). Un job n’est jamais distribué deux fois.'
          : tick === 2
            ? `Le job 2 (court) est fini : son worker, libre, prend le job suivant (${taken.join(', ') || '—'}) sans attendre les autres.`
            : tick === 5
              ? 'Seul le job 5, le plus long, tourne encore. Les résultats déjà sortis le sont dans l’ordre de fin, pas dans l’ordre d’entrée.'
              : taken.length > 0
                ? `Des workers libres prennent le job ${taken.join(', ')} : le travail est réparti au fil de l’eau.`
                : 'Plus de job à distribuer : les workers finissent leur travail.',
      state: shown,
      line: 3,
    })
    // Un pas de temps de calcul : les jobs terminés vont dans out.
    const out = [...s.out]
    const after = workers.map((w) => {
      if (w.job === null) return w
      const left = w.left - 1
      if (left === 0) {
        out.push(w.job)
        return { job: null, left: 0 }
      }
      return { job: w.job, left }
    })
    s = { ...shown, workers: after, out }
  }
  steps.push({ title: 'Le moniteur ferme out', detail: 'Tous les workers ont fini : wg.Wait() se débloque, close(out) est appelé une seule fois et le range de l’aval se termine.', state: { ...s, closed: true }, line: 5 })
  steps.push({ title: `Ordre d’arrivée : ${s.out.join(', ')}`, detail: 'Le fan-in ne garantit aucun ordre. Si l’ordre compte, joins l’indice du job au résultat et trie à la fin.', state: { ...s, closed: true }, line: 6 })
  return steps
}

export const STEPS = scenario()

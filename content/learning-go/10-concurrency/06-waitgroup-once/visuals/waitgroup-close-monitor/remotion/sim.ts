import type { Step } from '../../../../_shared/trace'

/**
 * Plusieurs producteurs écrivent dans un même channel de sortie : aucun d'eux ne peut le fermer (fermer deux fois panique,
 * et fermer pendant que les autres écrivent aussi). Une goroutine « moniteur » attend le WaitGroup puis ferme.
 */
export type W = { id: string; status: 'running' | 'done' }
export type State = { wg: number; ws: W[]; out: string[]; closed: boolean; ranEnded: boolean }

export const PROGRAM = [
  'var wg sync.WaitGroup',
  'wg.Add(3)',
  'for _, id := range ids {',
  '    go func() {',
  '        defer wg.Done()',
  '        out <- work(id)',
  '    }()',
  '}',
  'go func() {          // moniteur',
  '    wg.Wait(); close(out)',
  '}()',
  'for v := range out { use(v) }',
]

export function scenario(): Step<State>[] {
  const ws = (a: W['status'], b: W['status'], c: W['status']): W[] => [{ id: 'A', status: a }, { id: 'B', status: b }, { id: 'C', status: c }]
  const mk = (wg: number, w: W[], out: string[], closed = false, ranEnded = false): State => ({ wg, ws: w, out, closed, ranEnded })
  return [
    { title: 'Add(3) avant de lancer', detail: 'Le compteur vaut 3 : trois goroutines à attendre. Add se fait avant le go, jamais dedans.', state: mk(3, ws('running', 'running', 'running'), []), line: 1 },
    { title: 'Le moniteur attend', detail: 'Une quatrième goroutine fait wg.Wait() puis close(out). Elle ne fait rien d’autre : elle seule a le droit de fermer.', state: mk(3, ws('running', 'running', 'running'), []), line: 9 },
    { title: 'B termine : Done()', detail: 'Elle a écrit son résultat dans out, puis le defer wg.Done() décrémente le compteur : 2.', state: mk(2, ws('running', 'done', 'running'), ['B']), line: 4 },
    { title: 'A termine', detail: 'Compteur à 1. Le channel reste ouvert : C peut encore écrire.', state: mk(1, ws('done', 'done', 'running'), ['B', 'A']), line: 4 },
    { title: 'C termine : le compteur atteint 0', detail: 'Son defer wg.Done() ramène le compteur à 0 : wg.Wait() se débloque dans le moniteur.', state: mk(0, ws('done', 'done', 'done'), ['B', 'A', 'C']), line: 4 },
    { title: 'Le moniteur ferme out', detail: 'close(out) se fait une seule fois, quand plus personne n’écrira : aucun risque de panic.', state: mk(0, ws('done', 'done', 'done'), ['B', 'A', 'C'], true), line: 9 },
    { title: 'Le range se termine tout seul', detail: 'for v := range out lit les trois valeurs puis voit le channel fermé et sort de la boucle. Sans fermeture, il bloquerait pour toujours.', state: mk(0, ws('done', 'done', 'done'), [], true, true), line: 11 },
    { title: 'Piège : copier le WaitGroup', detail: 'Passe-le par pointeur, jamais par valeur : une copie a son propre compteur et wg.Wait() ne se débloquerait jamais.', state: mk(0, ws('done', 'done', 'done'), [], true, true), line: null },
  ]
}

export const STEPS = scenario()

import type { Step } from '../../../../_shared/trace'

/**
 * Fuite de goroutine : un générateur `countTo(n)` lance une goroutine qui écrit dans un channel sans tampon.
 * Si le consommateur abandonne la lecture avant la fin, cette goroutine reste bloquée sur son envoi pour toujours :
 * elle n'est jamais ramassée (le GC ne collecte pas une goroutine bloquée). Le correctif : un context annulable.
 */
export type GState = 'running' | 'blocked' | 'exited'
export type G = { id: string; state: GState }
export type State = { gs: G[]; base: number; note: string | null }

export const PROGRAM = [
  'func countTo(max int) <-chan int {',
  '    ch := make(chan int)',
  '    go func() {',
  '        for i := 1; i <= max; i++ {',
  '            ch <- i',
  '        }',
  '        close(ch)',
  '    }()',
  '    return ch',
  '}',
  'for v := range countTo(10) {',
  '    if v > 2 { break }',
  '}',
]

export const live = (s: State) => s.base + s.gs.filter((g) => g.state !== 'exited').length

export function scenario(): Step<State>[] {
  const mk = (gs: G[], note: string | null = null): State => ({ gs, base: 1, note })
  return [
    { title: 'Au départ : une goroutine', detail: 'runtime.NumGoroutine() vaut 1 : la goroutine main.', state: mk([]), line: null },
    { title: 'Appel 1 : countTo lance un producteur', detail: 'Il écrit 1, 2, 3… sur un channel sans tampon, au rythme du consommateur.', state: mk([{ id: 'prod 1', state: 'running' }]), line: 2 },
    { title: 'Le consommateur abandonne (break)', detail: 'Après avoir lu 1 et 2, la boucle sort sur break. Plus personne ne lira ce channel.', state: mk([{ id: 'prod 1', state: 'running' }], 'break'), line: 11 },
    { title: 'Le producteur reste bloqué', detail: 'ch <- 3 attend un récepteur qui ne viendra jamais. La goroutine ne se termine pas, elle garde sa pile et ses variables.', state: mk([{ id: 'prod 1', state: 'blocked' }]), line: 4 },
    { title: 'Appels 2 et 3 : la fuite s’accumule', detail: 'Chaque appel abandonné laisse une goroutine de plus. Dans un serveur, cela finit en mémoire saturée.', state: mk([{ id: 'prod 1', state: 'blocked' }, { id: 'prod 2', state: 'blocked' }, { id: 'prod 3', state: 'blocked' }]), line: 4 },
    { title: 'Aucun ramasse-miettes pour ça', detail: 'Le GC libère la mémoire inaccessible, mais une goroutine bloquée est considérée vivante : elle sera là jusqu’à l’arrêt du processus.', state: mk([{ id: 'prod 1', state: 'blocked' }, { id: 'prod 2', state: 'blocked' }, { id: 'prod 3', state: 'blocked' }]), line: null },
    { title: 'Le correctif : un context annulable', detail: 'countTo reçoit un ctx ; le producteur écrit dans un select avec <-ctx.Done(). Le consommateur appelle cancel() en sortant (defer).', state: mk([{ id: 'prod 4', state: 'running' }], 'ctx'), line: 4 },
    { title: 'cancel() réveille le producteur', detail: 'Le case <-ctx.Done() devient prêt : le producteur sort de sa boucle et se termine.', state: mk([{ id: 'prod 4', state: 'exited' }], 'cancel()'), line: 4 },
    { title: 'Le compteur revient à 1', detail: 'Règle : toute goroutine démarrée doit avoir une condition d’arrêt claire. Un test peut le vérifier avec runtime.NumGoroutine().', state: mk([{ id: 'prod 4', state: 'exited' }]), line: null },
  ]
}

export const STEPS = scenario()

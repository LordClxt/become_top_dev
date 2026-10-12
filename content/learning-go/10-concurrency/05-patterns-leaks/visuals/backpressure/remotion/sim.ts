import type { Step } from '../../../../_shared/trace'

/**
 * Contre-pression avec un channel tamponné comme jeu de jetons (PressureGauge) : un jeton pris par requête,
 * rendu à la fin. `select` avec `default` refuse tout de suite quand il n'y en a plus (réponse 429) au lieu de faire attendre.
 */
export const LIMIT = 2
export type Req = { id: number; status: 'running' | 'refused' | 'done' }
export type State = { tokens: number; reqs: Req[] }

export const PROGRAM = [
  'tickets := make(chan struct{}, 2)',
  '',
  'select {',
  'case tickets <- struct{}{}:',
  '    defer func() { <-tickets }()',
  '    handle(r)',
  'default:',
  '    http.Error(w, "trop", 429)',
  '}',
]

export function scenario(): Step<State>[] {
  const r = (id: number, status: Req['status']): Req => ({ id, status })
  const mk = (tokens: number, reqs: Req[]): State => ({ tokens, reqs })
  return [
    { title: 'Deux jetons disponibles', detail: 'Le channel tamponné de capacité 2 est vide : deux requêtes peuvent être traitées en même temps, pas plus.', state: mk(2, []), line: 0 },
    { title: 'Requête 1 : jeton pris', detail: 'L’envoi dans tickets réussit (il reste de la place) : le traitement commence.', state: mk(1, [r(1, 'running')]), line: 3 },
    { title: 'Requête 2 : second jeton pris', detail: 'Le channel est maintenant plein : plus aucun jeton.', state: mk(0, [r(1, 'running'), r(2, 'running')]), line: 3 },
    { title: 'Requête 3 : refusée tout de suite', detail: 'L’envoi bloquerait, donc select prend default : réponse 429 immédiate. La requête n’attend pas en file, le serveur ne s’effondre pas.', state: mk(0, [r(1, 'running'), r(2, 'running'), r(3, 'refused')]), line: 7 },
    { title: 'La requête 1 se termine', detail: 'Le defer <-tickets rend le jeton : une place se libère.', state: mk(1, [r(1, 'done'), r(2, 'running'), r(3, 'refused')]), line: 4 },
    { title: 'Requête 4 : acceptée', detail: 'Un jeton est de nouveau disponible : le traitement démarre.', state: mk(0, [r(1, 'done'), r(2, 'running'), r(3, 'refused'), r(4, 'running')]), line: 3 },
    { title: 'Pourquoi refuser plutôt que faire attendre ?', detail: 'Une file qui grandit sans limite fait monter la latence de tout le monde. Refuser tôt protège le service et laisse le client réessayer ailleurs : c’est la contre-pression.', state: mk(0, [r(1, 'done'), r(2, 'running'), r(3, 'refused'), r(4, 'running')]), line: null },
  ]
}

export const STEPS = scenario()

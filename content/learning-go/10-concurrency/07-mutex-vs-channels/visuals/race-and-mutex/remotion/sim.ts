import type { Step } from '../../../../_shared/trace'

/**
 * `counter++` n'est pas atomique : c'est lire, ajouter 1, écrire. Deux goroutines qui s'entrelacent peuvent lire la même
 * valeur et s'écraser mutuellement (mise à jour perdue). Un mutex impose qu'une seule exécute la section critique à la fois.
 * Le modèle exécute les micro-opérations dans un ordre explicite (celui de la vidéo), avec la sémantique réelle de Lock/Unlock.
 */
export type GStatus = 'idle' | 'read' | 'wrote' | 'blocked' | 'locked'
export type G = { reg: number | null; status: GStatus }
export type State = { counter: number; gs: [G, G]; holder: 0 | 1 | null; mutex: boolean }

export const PROGRAM = ['// sans protection', 'counter++', '// = lire, ajouter 1, écrire', '', '// avec mutex', 'mu.Lock()', 'counter++', 'mu.Unlock()']

const g = (reg: number | null, status: GStatus): G => ({ reg, status })

export function scenario(): Step<State>[] {
  const st = (counter: number, a: G, b: G, holder: 0 | 1 | null, mutex: boolean): State => ({ counter, gs: [a, b], holder, mutex })
  return [
    { title: 'Deux goroutines, un compteur', detail: 'Chaque goroutine exécute counter++ une fois. On s’attend à 2 à la fin.', state: st(0, g(null, 'idle'), g(null, 'idle'), null, false), line: 1 },
    { title: 'G1 lit le compteur', detail: 'Elle range 0 dans un registre : ce n’est qu’une lecture, rien n’est encore écrit.', state: st(0, g(0, 'read'), g(null, 'idle'), null, false), line: 2 },
    { title: 'G2 lit aussi : 0', detail: 'G1 n’a rien écrit : G2 voit encore 0. Les deux goroutines partent de la même valeur.', state: st(0, g(0, 'read'), g(0, 'read'), null, false), line: 2 },
    { title: 'G1 écrit 1', detail: 'Elle ajoute 1 à sa copie (0 + 1) et écrit le résultat : le compteur vaut 1.', state: st(1, g(1, 'wrote'), g(0, 'read'), null, false), line: 2 },
    { title: 'G2 écrit 1 : une mise à jour est perdue', detail: 'Elle ajoute 1 à SA copie périmée (0 + 1) et écrase le compteur. Résultat : 1 au lieu de 2. Aucune erreur, aucun plantage. go test -race signalerait cette course.', state: st(1, g(1, 'wrote'), g(1, 'wrote'), null, false), line: 2 },
    { title: 'Avec un mutex : G1 prend le verrou', detail: 'mu.Lock() réussit : G1 est seule dans la section critique.', state: st(0, g(null, 'locked'), g(null, 'idle'), 0, true), line: 5 },
    { title: 'G2 demande le verrou : elle attend', detail: 'Lock bloque G2 tant que G1 n’a pas fait Unlock. G1 lit 0.', state: st(0, g(0, 'read'), g(null, 'blocked'), 0, true), line: 6 },
    { title: 'G1 écrit 1 et libère', detail: 'Elle écrit 1 puis appelle Unlock : le verrou passe à G2, qui peut enfin avancer.', state: st(1, g(1, 'wrote'), g(null, 'locked'), 1, true), line: 7 },
    { title: 'G2 lit 1, écrit 2', detail: 'Elle lit la valeur à jour (1), ajoute 1 et écrit 2. Aucune mise à jour n’est perdue.', state: st(2, g(1, 'wrote'), g(2, 'wrote'), 1, true), line: 6 },
    { title: 'Résultat : 2', detail: 'Le mutex sérialise la section critique. Garde-la courte, ne copie jamais un Mutex, et pense à defer mu.Unlock().', state: st(2, g(1, 'wrote'), g(2, 'wrote'), null, true), line: 7 },
  ]
}

export const STEPS = scenario()

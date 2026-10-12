import type { Step } from '../../../../_shared/trace'

/**
 * Les 5 états d'un channel et leur comportement en lecture, écriture et fermeture.
 * Les cellules sont celles de la spécification du langage ; la vidéo les révèle ligne par ligne.
 */
export type Verdict = 'wait' | 'ok' | 'panic'
export type Cell = { text: string; verdict: Verdict }
export type Row = { name: string; read: Cell; write: Cell; close: Cell }
export type State = { rows: number }

export const ROWS: Row[] = [
  {
    name: 'Sans tampon, ouvert',
    read: { text: 'attend qu’on écrive', verdict: 'wait' },
    write: { text: 'attend qu’on lise', verdict: 'wait' },
    close: { text: 'fonctionne', verdict: 'ok' },
  },
  {
    name: 'Sans tampon, fermé',
    read: { text: 'valeur zéro, ok = false', verdict: 'ok' },
    write: { text: 'PANIC', verdict: 'panic' },
    close: { text: 'PANIC', verdict: 'panic' },
  },
  {
    name: 'Avec tampon, ouvert',
    read: { text: 'attend si vide', verdict: 'wait' },
    write: { text: 'attend si plein', verdict: 'wait' },
    close: { text: 'fonctionne (le reste reste lisible)', verdict: 'ok' },
  },
  {
    name: 'Avec tampon, fermé',
    read: { text: 'valeurs restantes, puis zéro', verdict: 'ok' },
    write: { text: 'PANIC', verdict: 'panic' },
    close: { text: 'PANIC', verdict: 'panic' },
  },
  {
    name: 'nil',
    read: { text: 'bloque pour toujours', verdict: 'wait' },
    write: { text: 'bloque pour toujours', verdict: 'wait' },
    close: { text: 'PANIC', verdict: 'panic' },
  },
]

export const PROGRAM = ['v := <-ch      // lire', 'ch <- v        // écrire', 'close(ch)       // fermer', '', 'var ch chan int  // nil']

export function scenario(): Step<State>[] {
  const t = [
    ['Trois opérations, cinq états', 'Lire, écrire, fermer : le comportement dépend de l’état du channel. On le dévoile ligne par ligne.', 0],
    ['Sans tampon, ouvert', 'Lire et écrire attendent leur partenaire (rendez-vous). Fermer est permis.', 1],
    ['Sans tampon, fermé', 'Lire ne bloque jamais : valeur zéro. Écrire ou fermer de nouveau déclenche un panic.', 2],
    ['Avec tampon, ouvert', 'On n’attend que si le tampon est vide (lecture) ou plein (écriture). Fermer laisse les valeurs en attente lisibles.', 3],
    ['Avec tampon, fermé', 'Les valeurs restantes sont d’abord rendues, puis la valeur zéro. Toujours panic pour écrire ou refermer.', 4],
    ['Le channel nil', 'Un channel jamais initialisé bloque lecture et écriture pour toujours (utile dans un select, voir plus loin) ; le fermer panique.', 5],
    ['À retenir', 'Seul l’écrivain ferme, une seule fois. Lire un channel fermé est toujours sûr ; écrire dedans ne l’est jamais.', 5],
  ] as const
  return t.map(([title, detail, rows], i) => ({ title, detail, state: { rows }, line: i === 5 ? 4 : null }))
}

export const STEPS = scenario()

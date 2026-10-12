import type { Step } from '../../../../_shared/trace'

/**
 * Channel sans tampon (capacité 0) : l'envoi et la réception se terminent ensemble, au moment du rendez-vous.
 * Une goroutine qui arrive la première bloque jusqu'à l'arrivée de l'autre ; la valeur ne transite jamais « dans » le channel.
 */
export type Status = 'idle' | 'run' | 'blocked' | 'done'
export type Where = 'none' | 'sender' | 'receiver'
export type State = { sender: Status; receiver: Status; value: Where; got: boolean }

export const PROGRAM = [
  'ch := make(chan int)',
  '',
  'go func() {',
  '    ch <- 42        // émetteur',
  '}()',
  '',
  'v := <-ch           // récepteur',
  'fmt.Println(v)',
]

export function scenario(): Step<State>[] {
  const s = (sender: Status, receiver: Status, value: Where, got = false): State => ({ sender, receiver, value, got })
  return [
    { title: 'Un channel sans tampon', detail: 'make(chan int) crée un channel de capacité 0 : il ne peut contenir aucune valeur en attente.', state: s('idle', 'idle', 'none'), line: 0 },
    { title: 'L’émetteur arrive le premier', detail: 'ch <- 42 : personne n’attend de lire. Impossible de déposer la valeur quelque part.', state: s('run', 'idle', 'sender'), line: 3 },
    { title: 'L’émetteur bloque', detail: 'La goroutine est mise en attente : elle ne fait plus rien tant qu’un récepteur n’est pas là.', state: s('blocked', 'idle', 'sender'), line: 3 },
    { title: 'Le récepteur arrive : rendez-vous', detail: 'v := <-ch trouve un émetteur en attente : la valeur passe directement de l’un à l’autre.', state: s('blocked', 'run', 'receiver', true), line: 6 },
    { title: 'Les deux repartent', detail: 'L’envoi et la réception se terminent au même instant. v vaut 42, l’émetteur est débloqué.', state: s('done', 'run', 'receiver', true), line: 7 },
    { title: 'Cas inverse : le récepteur d’abord', detail: 'Si c’est v := <-ch qui arrive en premier, c’est lui qui bloque en attendant un émetteur.', state: s('idle', 'blocked', 'none'), line: 6 },
    { title: 'L’émetteur le débloque', detail: 'ch <- 42 trouve le récepteur en attente : même rendez-vous, dans l’autre sens.', state: s('run', 'run', 'receiver', true), line: 3 },
    { title: 'Synchronisation gratuite', detail: 'Un channel sans tampon n’échange pas seulement une valeur : il synchronise deux goroutines à un instant précis.', state: s('done', 'run', 'receiver', true), line: 7 },
  ]
}

export const STEPS = scenario()

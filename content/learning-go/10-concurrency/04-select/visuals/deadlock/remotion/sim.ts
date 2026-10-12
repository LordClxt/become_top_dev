import type { Step } from '../../../../_shared/trace'

/**
 * Deadlock : le runtime Go le détecte quand TOUTES les goroutines sont endormies (bloquées sur un channel,
 * un mutex, un WaitGroup…) et qu'aucune ne peut être réveillée. Si une seule goroutine peut encore tourner
 * (serveur HTTP, ticker…), il n'y a pas de détection : le programme reste figé en silence.
 */
export type Status = 'idle' | 'run' | 'blocked'
export type G = { name: string; status: Status; waits?: string }
export type State = { gs: G[]; fatal: boolean }

export const PROGRAM = [
  '// cas 1 : main seul',
  'ch := make(chan int)',
  'ch <- 1          // personne ne lit',
  '',
  '// cas 2 : deux goroutines',
  'go func() { <-ba; ab <- 1 }()',
  '<-ab',
  'ba <- 1',
]

export function scenario(): Step<State>[] {
  const st = (gs: G[], fatal = false): State => ({ gs, fatal })
  return [
    { title: 'Cas 1 : main écrit sans lecteur', detail: 'ch est sans tampon et aucune autre goroutine ne lira jamais ce channel.', state: st([{ name: 'main', status: 'run' }]), line: 2 },
    { title: 'main s’endort', detail: 'ch <- 1 attend un récepteur : la goroutine est bloquée, hors de tout processeur.', state: st([{ name: 'main', status: 'blocked', waits: 'envoi sur ch' }]), line: 2 },
    { title: 'Plus aucune goroutine ne peut tourner', detail: 'Le runtime constate que toutes les goroutines sont endormies et qu’aucune ne peut en réveiller une autre.', state: st([{ name: 'main', status: 'blocked', waits: 'envoi sur ch' }], true), line: 2 },
    { title: 'Cas 2 : deux goroutines qui s’attendent', detail: 'main attend une valeur sur ab ; la goroutine G2 attend une valeur sur ba avant d’envoyer sur ab.', state: st([{ name: 'main', status: 'run' }, { name: 'G2', status: 'run' }]), line: 5 },
    { title: 'G2 attend ba', detail: 'Elle doit lire ba avant d’écrire ab. Mais c’est main qui écrit ba… plus tard.', state: st([{ name: 'main', status: 'run' }, { name: 'G2', status: 'blocked', waits: 'lecture de ba' }]), line: 5 },
    { title: 'main attend ab', detail: 'main lit ab avant d’écrire ba. Chacune attend ce que l’autre n’enverra jamais : c’est une attente circulaire.', state: st([{ name: 'main', status: 'blocked', waits: 'lecture de ab' }, { name: 'G2', status: 'blocked', waits: 'lecture de ba' }]), line: 6 },
    { title: 'Deadlock détecté', detail: 'Toutes les goroutines dorment : le programme s’arrête sur une erreur fatale. Corriger : envoyer d’abord, ou lire dans un select avec une sortie.', state: st([{ name: 'main', status: 'blocked', waits: 'lecture de ab' }, { name: 'G2', status: 'blocked', waits: 'lecture de ba' }], true), line: 6 },
    { title: 'Piège : un deadlock partiel passe inaperçu', detail: 'Si une troisième goroutine tourne encore (un serveur, un ticker), le runtime ne déclare rien : main et G2 restent bloquées en silence. Il faut le voir avec un profil de goroutines.', state: st([{ name: 'main', status: 'blocked', waits: 'lecture de ab' }, { name: 'G2', status: 'blocked', waits: 'lecture de ba' }, { name: 'ticker', status: 'run' }]), line: null },
  ]
}

export const STEPS = scenario()

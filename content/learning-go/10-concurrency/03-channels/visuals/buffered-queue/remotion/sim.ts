import type { Step } from '../../../../_shared/trace'

/**
 * Channel tamponné de capacité 3. Modèle fidèle : un envoi réussit tant que len < cap ; sinon l'émetteur
 * attend. Une réception vide la plus ancienne valeur et, s'il y a un émetteur en attente, sa valeur entre dans le tampon.
 */
export const CAP = 3
export type State = { buf: number[]; waiting: number | null; got: number[]; closed: boolean }

export const PROGRAM = ['ch := make(chan int, 3)', '', 'ch <- v      // producteur', 'v := <-ch    // consommateur', 'close(ch)']

const send = (s: State, v: number): State =>
  s.buf.length < CAP ? { ...s, buf: [...s.buf, v] } : { ...s, waiting: v }

const recv = (s: State): State => {
  const [head, ...rest] = s.buf
  if (head === undefined) return s
  const buf = s.waiting !== null ? [...rest, s.waiting] : rest
  return { ...s, buf, waiting: null, got: [...s.got, head] }
}

export function scenario(): Step<State>[] {
  let s: State = { buf: [], waiting: null, got: [], closed: false }
  const steps: Step<State>[] = []
  const push = (title: string, detail: string, line: number | null) => steps.push({ title, detail, state: s, line })

  push('Un tampon de 3 places', 'make(chan int, 3) : l’émetteur peut déposer jusqu’à 3 valeurs sans attendre personne.', 0)
  s = send(s, 1)
  push('Envoi 1 : pas d’attente', 'Il reste de la place, ch <- 1 rend la main tout de suite. Le producteur n’a pas besoin du consommateur.', 2)
  s = send(send(s, 2), 3)
  push('Envois 2 et 3 : tampon plein', 'len(ch) = 3 = cap(ch). Toujours aucun consommateur, mais rien n’a encore bloqué.', 2)
  s = send(s, 4)
  push('Envoi 4 : le producteur bloque', 'Plus de place : ch <- 4 attend. La valeur 4 est retenue par la goroutine en attente, pas dans le tampon.', 2)
  s = recv(s)
  push('Une lecture libère une place', 'Le consommateur prend 1 (premier entré, premier sorti). La valeur 4 entre dans le tampon et le producteur repart.', 3)
  s = send(s, 5)
  push('Envoi 5 : bloque à nouveau', 'Le tampon est de nouveau plein (2, 3, 4). Le producteur ne peut avancer qu’au rythme du consommateur : c’est la contre-pression.', 2)
  s = recv(recv(s))
  push('Le consommateur rattrape son retard', 'Deux lectures : 2 puis 3. La valeur 5 entre dans le tampon dès qu’une place se libère.', 3)
  s = { ...s, closed: true }
  push('close(ch) : plus d’envoi possible', 'Le producteur ferme le channel. Les valeurs déjà dans le tampon (4, 5) restent lisibles.', 4)
  s = recv(recv(s))
  push('Le tampon est vidé', 'Après 4 et 5, une lecture renverrait la valeur zéro avec ok = false : le range s’arrête.', 3)
  return steps
}

export const STEPS = scenario()

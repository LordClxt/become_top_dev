import type { Step } from '../../../../_shared/trace'

/**
 * select : parmi les cases prêtes, Go en choisit une au hasard (aucune n'est favorisée, donc aucune famine).
 * Le tirage de la vidéo est pseudo-aléatoire mais déterministe (générateur congruentiel, graine 19) pour être reproductible.
 */
export type Pick = '1' | '2' | 'default' | null
export type State = { ready1: boolean; ready2: boolean; hasDefault: boolean; n1: number; n2: number; last: Pick; blocked: boolean }

export const PROGRAM = ['for i := 0; i < 6; i++ {', '    select {', '    case <-ch1:  n1++', '    case <-ch2:  n2++', '    default:     // optionnel', '    }', '}']

function draws(count: number): ('1' | '2')[] {
  let s = 19
  return Array.from({ length: count }, () => {
    s = (1103515245 * s + 12345) % 0x7fffffff
    return ((s >>> 16) & 1) === 0 ? '1' : '2'
  })
}

export function scenario(): Step<State>[] {
  const base: State = { ready1: true, ready2: true, hasDefault: false, n1: 0, n2: 0, last: null, blocked: false }
  const steps: Step<State>[] = [
    { title: 'Deux channels prêts', detail: 'ch1 et ch2 ont chacun une valeur à lire. Quand plusieurs cases sont prêtes, select en choisit une au hasard.', state: base, line: 1 },
  ]
  let s = base
  draws(6).forEach((d, i) => {
    s = { ...s, last: d, n1: s.n1 + (d === '1' ? 1 : 0), n2: s.n2 + (d === '2' ? 1 : 0) }
    steps.push({
      title: `Tour ${i + 1} : la case ch${d}`,
      detail: i === 0 ? 'Aucune case n’est prioritaire : l’ordre d’écriture dans le code ne compte pas.' : i === 5 ? 'Pas d’alternance régulière ni de préférence : c’est ce hasard qui évite qu’une case soit toujours servie en dernier.' : 'Le choix est indépendant du précédent.',
      state: s,
      line: d === '1' ? 2 : 3,
    })
  })
  s = { ...s, ready1: false, last: null }
  steps.push({ title: 'Un seul channel prêt', detail: 'ch1 est vide : seule la case ch2 peut s’exécuter. Il n’y a plus de choix.', state: s, line: 3 })
  s = { ...s, ready2: false, blocked: true }
  steps.push({ title: 'Aucun channel prêt : select bloque', detail: 'Sans default, la goroutine attend qu’une case devienne possible. Si aucune ne le devient jamais : deadlock.', state: s, line: 1 })
  s = { ...s, hasDefault: true, blocked: false, last: 'default' }
  steps.push({ title: 'Avec default : jamais bloquant', detail: 'Rien n’est prêt, donc la branche default s’exécute immédiatement. Dans un for, elle transforme la boucle en attente active qui consomme 100 % d’un cœur.', state: s, line: 4 })
  return steps
}

export const STEPS = scenario()

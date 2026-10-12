import type { Step } from '../../../../_shared/trace'

/**
 * Deux tâches indépendantes, A et B, de 3 unités de travail chacune.
 * - Concurrence : un seul cœur les entrelace (le planificateur alterne) → 6 unités de temps.
 * - Parallélisme : deux cœurs les exécutent en même temps → 3 unités de temps.
 */
export type Cell = { core: number; tick: number; task: 'A' | 'B'; n: number }
export type State = { cores: 1 | 2; cells: Cell[] }

export const PROGRAM = ['go A()   // 3 unités de travail', 'go B()   // 3 unités de travail', '', '// A et B ne dépendent pas', '// l’une de l’autre.']

export function scenario(): Step<State>[] {
  const steps: Step<State>[] = []
  const push = (title: string, detail: string, state: State, line: number | null = null) =>
    steps.push({ title, detail, state, line })

  push('Deux tâches indépendantes', 'A et B demandent chacune 3 unités de travail. Rien ne les oblige à s’attendre : elles peuvent être menées de front.', { cores: 1, cells: [] }, 0)

  let cells: Cell[] = []
  // Un seul cœur : A1 B1 | A2 B2 | A3 B3.
  for (let n = 1; n <= 3; n++) {
    cells = [...cells, { core: 0, tick: 2 * (n - 1), task: 'A', n }, { core: 0, tick: 2 * (n - 1) + 1, task: 'B', n }]
    push(
      n === 1 ? 'Un seul cœur : on alterne' : n === 2 ? 'A et B avancent toutes les deux' : 'Fini en 6 unités de temps',
      n === 3
        ? 'Les deux tâches ont avancé « ensemble », mais jamais au même instant : c’est de la concurrence sans parallélisme.'
        : 'Le planificateur donne une unité à A, puis une à B. Chacune progresse, sans jamais s’exécuter en même temps que l’autre.',
      { cores: 1, cells },
      n === 1 ? 0 : 1,
    )
  }

  // Deux cœurs : A1 A2 A3 sur le cœur 0, B1 B2 B3 sur le cœur 1.
  cells = []
  push('Deux cœurs : même structure', 'Le programme n’a pas changé : toujours go A() et go B(). Seul le matériel disponible est différent.', { cores: 2, cells }, 0)
  for (let n = 1; n <= 3; n++) {
    cells = [...cells, { core: 0, tick: n - 1, task: 'A', n }, { core: 1, tick: n - 1, task: 'B', n }]
    push(
      n === 1 ? 'Chaque tâche a son cœur' : n === 2 ? 'Elles avancent au même instant' : 'Fini en 3 unités de temps',
      n === 3
        ? 'Même programme, deux fois plus vite : c’est du parallélisme, possible parce que le code était déjà structuré en tâches indépendantes.'
        : 'À chaque unité de temps, A et B progressent simultanément, une sur chaque cœur.',
      { cores: 2, cells },
      n === 1 ? 1 : null,
    )
  }

  push(
    'Concurrence ≠ parallélisme',
    'La concurrence décrit comment on structure le travail ; le parallélisme décrit comment le matériel l’exécute. Go te donne la première, le runtime tire parti de la seconde.',
    { cores: 2, cells },
  )
  return steps
}

export const STEPS = scenario()

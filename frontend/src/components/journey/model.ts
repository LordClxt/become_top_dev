import type { Chapter, ExerciseSummary, Mastery } from '@/lib/api'

/** Logique pure du parcours d'un module : étape suivante, XP, ce qu'il manque pour la maîtrise. */

export type Step =
  | { kind: 'lesson'; id: string; title: string; xp: number; done: boolean }
  | {
      kind: 'lab' | 'assignment' | 'project' | 'boss'
      id: string
      title: string
      xp: number
      done: boolean
    }

const exStep = (ex: ExerciseSummary): Step => ({
  kind: ex.role === 'lab' ? 'lab' : ex.role,
  id: ex.id,
  title: ex.title,
  xp: ex.xp,
  done: ex.passed,
})

/** Toutes les étapes dans l'ordre conseillé : leçon, ses TP, leçon suivante… puis devoir, projet, boss. */
export function moduleSteps(ch: Chapter): Step[] {
  const steps: Step[] = []
  for (const l of ch.lessons) {
    steps.push({
      kind: 'lesson',
      id: l.id,
      title: l.title,
      xp: l.xp,
      done: l.completed,
    })
    for (const lab of l.labs) steps.push(exStep(lab))
  }
  for (const ex of [ch.assignment, ch.project, ch.boss]) if (ex) steps.push(exStep(ex))
  return steps
}

export const nextStep = (ch: Chapter) => moduleSteps(ch).find((s) => !s.done) ?? null

export function moduleXp(ch: Chapter) {
  let won = 0
  let total = 0
  for (const s of moduleSteps(ch)) {
    total += s.xp
    if (s.done) won += s.xp
  }
  return { won, total }
}

export const STEP_LABEL: Record<Step['kind'], string> = {
  lesson: 'Leçon',
  lab: 'TP',
  assignment: 'Devoir',
  project: 'Projet fil rouge',
  boss: 'Boss',
}

/**
 * Le plus petit effort pour franchir le seuil : on essaie chaque nombre de TP en plus,
 * on en déduit les bonnes réponses au quiz nécessaires, et on garde le total minimal.
 * Score = moyenne (TP réussis / TP) et (quiz justes du premier coup / questions), comme le backend.
 */
export function missingForMastery(m: Mastery, threshold: number): { labs: number; quiz: number } | null {
  if (m.mastered) return null
  const labRatio = (n: number) => (m.labs_total ? n / m.labs_total : 1)
  const quizRatio = (n: number) => (m.quiz_total ? n / m.quiz_total : 1)
  let best: { labs: number; quiz: number } | null = null
  for (let k = 0; k <= m.labs_total - m.labs_passed; k++) {
    const lr = labRatio(m.labs_passed + k)
    let q = 0
    const maxQ = m.quiz_total - m.quiz_correct
    while (q <= maxQ && (lr + quizRatio(m.quiz_correct + q)) / 2 < threshold - 1e-9) q++
    if (q > maxQ) continue
    if (!best || k + q < best.labs + best.quiz) best = { labs: k, quiz: q }
  }
  return best
}

export function missingSentence(m: Mastery, threshold: number): string {
  if (m.mastered) return 'Module maîtrisé : le suivant est ouvert.'
  const miss = missingForMastery(m, threshold)
  if (!miss) return 'Le seuil n’est plus atteignable avec les questions restantes : rejoue les TP pour consolider.'
  const parts: string[] = []
  if (miss.labs) parts.push(`${miss.labs} TP`)
  if (miss.quiz) parts.push(`${miss.quiz} bonne${miss.quiz > 1 ? 's' : ''} réponse${miss.quiz > 1 ? 's' : ''} au quiz`)
  return `Il te manque ${parts.join(' et ')} pour maîtriser le module.`
}

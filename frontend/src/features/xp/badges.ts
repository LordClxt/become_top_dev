import {
  BookOpenCheck,
  CircleCheckBig,
  Flame,
  FlaskConical,
  type LucideIcon,
  Mountain,
  Skull,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import type { Progress } from '@/lib/api'

export type BadgeFamily = 'lessons' | 'labs' | 'quiz' | 'streak' | 'modules' | 'level' | 'days' | 'bosses'

export type Badge = {
  id: string
  family: BadgeFamily
  /** Palier dans la famille : 1 bronze, 2 argent, 3 or. */
  tier: 1 | 2 | 3
  title: string
  /** Ce qu'il faut faire pour l'obtenir, à l'infinitif. */
  goal: string
  icon: LucideIcon
  have: number
  need: number
  earned: boolean
}

export const FAMILY_TITLE: Record<BadgeFamily, string> = {
  lessons: 'Lecture',
  labs: 'Pratique',
  quiz: 'Mémoire',
  streak: 'Régularité',
  modules: 'Maîtrise',
  level: 'Niveau',
  days: 'Endurance',
  bosses: 'Boss',
}

/**
 * Badges dérivés de la progression réelle (logique pure) : rien n'est stocké, rien n'est inventé.
 * `bossesDefeated` vient des modules chargés à part ; absent, la famille Boss n'apparaît pas.
 */
export function badgesFor(progress: Progress, extra: { bossesDefeated?: number } = {}): Badge[] {
  const chapters = Object.values(progress.chapters)
  const sum = (pick: (m: (typeof chapters)[number]) => number) => chapters.reduce((n, m) => n + pick(m), 0)
  const lessons = sum((m) => m.lessons_done)
  const labs = sum((m) => m.labs_passed)
  const quiz = sum((m) => m.quiz_correct)
  const mastered = chapters.filter((m) => m.mastered).length
  const streak = progress.longest_streak_days

  type Spec = Omit<Badge, 'earned'>
  const tiers = (
    family: BadgeFamily,
    icon: LucideIcon,
    have: number,
    steps: [number, string, string][],
  ): Spec[] =>
    steps.map(([need, title, goal], i) => ({
      id: `${family}-${need}`,
      family,
      tier: (i + 1) as 1 | 2 | 3,
      title,
      goal,
      icon,
      have,
      need,
    }))

  const specs: Spec[] = [
    ...tiers('lessons', BookOpenCheck, lessons, [
      [1, 'Première leçon', 'Terminer une leçon'],
      [10, 'Lecteur assidu', 'Terminer 10 leçons'],
      [25, 'Bibliothèque vivante', 'Terminer 25 leçons'],
    ]),
    ...tiers('labs', FlaskConical, labs, [
      [1, 'Premier TP au vert', 'Faire passer les tests d’un TP'],
      [10, 'Tests au vert', 'Réussir 10 TP'],
      [25, 'Atelier rodé', 'Réussir 25 TP'],
    ]),
    ...tiers('quiz', CircleCheckBig, quiz, [
      [10, 'Dix du premier coup', 'Répondre juste à 10 questions de quiz'],
      [50, 'Mémoire vive', 'Répondre juste à 50 questions de quiz'],
      [150, 'Encyclopédie', 'Répondre juste à 150 questions de quiz'],
    ]),
    ...tiers('streak', Flame, streak, [
      [3, 'Trois jours d’affilée', 'Pratiquer trois jours de suite'],
      [7, 'Une semaine pleine', 'Pratiquer sept jours de suite'],
      [30, 'Un mois sans faillir', 'Pratiquer 30 jours de suite'],
    ]),
    ...tiers('modules', Trophy, mastered, [
      [1, 'Module maîtrisé', 'Atteindre le seuil de maîtrise d’un module'],
      [3, 'Trois modules', 'Maîtriser trois modules'],
    ]),
    ...tiers('level', TrendingUp, progress.level, [
      [5, 'Niveau 5', 'Atteindre le niveau 5'],
      [10, 'Niveau 10', 'Atteindre le niveau 10'],
    ]),
    ...tiers('days', Mountain, progress.active_days, [[30, 'Trente jours actifs', 'Pratiquer 30 jours, consécutifs ou non']]),
    ...(extra.bossesDefeated === undefined
      ? []
      : tiers('bosses', Skull, extra.bossesDefeated, [
          [1, 'Premier boss', 'Vaincre le boss d’un module'],
          [3, 'Chasseur de boss', 'Vaincre trois boss'],
        ])),
  ]
  return specs.map((b) => ({ ...b, have: Math.min(b.have, b.need), earned: b.have >= b.need }))
}

/** Le badge non obtenu le plus proche (part de chemin la plus grande, puis le moins d'effort restant). */
export function nextBadge(badges: Badge[]): Badge | null {
  const open = badges.filter((b) => !b.earned)
  open.sort((a, b) => b.have / b.need - a.have / a.need || a.need - a.have - (b.need - b.have))
  return open[0] ?? null
}

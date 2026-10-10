import {
  BookOpenCheck,
  CircleCheckBig,
  Flame,
  FlaskConical,
  type LucideIcon,
  Mountain,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import type { Progress } from '@/lib/api'

export type Badge = {
  id: string
  title: string
  /** Ce qu'il faut faire pour l'obtenir, à l'infinitif. */
  goal: string
  icon: LucideIcon
  have: number
  need: number
  earned: boolean
}

/** Badges dérivés de la progression réelle (logique pure) : rien n'est stocké, rien n'est inventé. */
export function badgesFor(progress: Progress): Badge[] {
  const chapters = Object.values(progress.chapters)
  const sum = (pick: (m: (typeof chapters)[number]) => number) => chapters.reduce((n, m) => n + pick(m), 0)

  const specs: Omit<Badge, 'earned'>[] = [
    { id: 'first-lesson', title: 'Première leçon', goal: 'Terminer une leçon', icon: BookOpenCheck, have: sum((m) => m.lessons_done), need: 1 },
    { id: 'first-lab', title: 'Premier TP au vert', goal: 'Faire passer les tests d’un TP', icon: FlaskConical, have: sum((m) => m.labs_passed), need: 1 },
    { id: 'quiz-10', title: 'Dix du premier coup', goal: 'Répondre juste à 10 questions dès le premier essai', icon: CircleCheckBig, have: sum((m) => m.quiz_correct), need: 10 },
    { id: 'streak-3', title: 'Trois jours d’affilée', goal: 'Pratiquer trois jours de suite', icon: Flame, have: progress.longest_streak_days, need: 3 },
    { id: 'streak-7', title: 'Une semaine pleine', goal: 'Pratiquer sept jours de suite', icon: Flame, have: progress.longest_streak_days, need: 7 },
    { id: 'first-module', title: 'Module maîtrisé', goal: 'Atteindre le seuil de maîtrise d’un module', icon: Trophy, have: chapters.filter((m) => m.mastered).length, need: 1 },
    { id: 'level-5', title: 'Niveau 5', goal: 'Atteindre le niveau 5', icon: TrendingUp, have: progress.level, need: 5 },
    { id: 'active-30', title: 'Trente jours actifs', goal: 'Pratiquer 30 jours, consécutifs ou non', icon: Mountain, have: progress.active_days, need: 30 },
  ]
  return specs.map((b) => ({ ...b, have: Math.min(b.have, b.need), earned: b.have >= b.need }))
}

import { api } from '@/lib/api'

/** Clés partagées avec le tableau de bord : une note invalide les deux. */
export const reviewQuery = { queryKey: ['review'], queryFn: api.review }
export const leaderboardQuery = { queryKey: ['leaderboard'], queryFn: api.leaderboard }

/** Le strict nécessaire de /api/today pour proposer « Continuer » (le type complet appartient au tableau de bord). */
export type TodayContinue = {
  type: 'lesson' | 'exercise' | 'chapter'
  id: string
  title: string
  label: string
  course_title?: string
}
type TodayLite = { continue: TodayContinue | null; review_due?: number; goal_xp?: number }

export const todayQuery = {
  queryKey: ['today'],
  queryFn: async (): Promise<TodayLite> => {
    const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
    const res = await fetch(`/api/today?tz=${tz}`, { credentials: 'include' })
    if (!res.ok) throw new Error(res.statusText)
    return res.json()
  },
}

/** « aujourd'hui », « demain », « dans 3 jours », « dans 2 semaines ». Date au format AAAA-MM-JJ, jour local. */
export function dueInWords(iso: string | null | undefined): string {
  if (!iso) return 'bientôt'
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number)
  const days = Math.round((Date.UTC(y, m - 1, d) - today) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  if (days < 14) return `dans ${days} jours`
  if (days < 60) return `dans ${Math.round(days / 7)} semaines`
  return `dans ${Math.round(days / 30)} mois`
}

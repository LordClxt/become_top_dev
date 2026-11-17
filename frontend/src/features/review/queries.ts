import { api } from '@/lib/api'

/** Clés partagées avec le tableau de bord : une note invalide les deux. */
export const reviewQuery = { queryKey: ['review'], queryFn: api.review }
// Le jour et le classement viennent du tableau de bord : une seule queryFn par clé.
export { leaderboardQuery, todayQuery } from '@/features/habit/queries'

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

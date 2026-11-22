import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { announceXp } from '@/features/xp/xp-events'
import { api, type TodayContinue } from '@/lib/api'

/** Le jour de l'apprenant : objectif, série, quêtes, coffre, prochain pas. Donnée utilisateur, lue côté client. */
export const todayQuery = queryOptions({ queryKey: ['today'], queryFn: api.today, staleTime: 30_000 })

export const leaderboardQuery = queryOptions({ queryKey: ['leaderboard'], queryFn: api.leaderboard, staleTime: 60_000 })

/** Réclame une quête terminée : l'XP est annoncée, le jour et la progression sont relus. */
export function useClaimQuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; title: string }) => api.claimQuest(id),
    onSuccess: async (res, { title }) => {
      announceXp({ amount: res.xp_awarded, reason: 'Quête du jour', kind: 'quest', title })
      await Promise.all([qc.invalidateQueries({ queryKey: ['today'] }), qc.invalidateQueries({ queryKey: ['progress'] })])
    },
  })
}

/** Ouvre le coffre : le montant est connu à la réponse, la révélation est différée par l'appelant. */
export function useClaimChest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.claimChest,
    onSettled: () => {
      // Relu après l'animation par l'appelant ; ici on garantit seulement la cohérence en cas d'erreur.
      void qc.invalidateQueries({ queryKey: ['progress'] })
    },
  })
}

/** La route d'un élément « Continuer ». */
export function continueLink(c: TodayContinue) {
  switch (c.type) {
    case 'lesson':
      // hash : la section où l'on s'était arrêté (la page de leçon y défile).
      return { to: '/lessons/$lessonId', params: { lessonId: c.id }, hash: c.anchor } as const
    case 'exercise':
      return { to: '/exercises/$exerciseId', params: { exerciseId: c.id } } as const
    default:
      return { to: '/chapters/$chapterId', params: { chapterId: c.id } } as const
  }
}

export function continuePath(c: TodayContinue): string {
  // Sans l'ancre : sert à comparer avec le chemin courant (qui n'en a jamais).
  return c.type === 'lesson' ? `/lessons/${c.id}` : c.type === 'exercise' ? `/exercises/${c.id}` : `/chapters/${c.id}`
}

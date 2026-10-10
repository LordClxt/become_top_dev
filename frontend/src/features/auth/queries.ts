import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Session courante. Lue par le garde de l'espace connecté et par la page d'accueil. */
export const meQuery = queryOptions({ queryKey: ['me'], queryFn: api.me, staleTime: 5 * 60_000 })

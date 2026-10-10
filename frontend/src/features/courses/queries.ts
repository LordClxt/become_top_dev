import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Catalogue public : métadonnées et modules prévus, sans progression. */
export const catalogQuery = queryOptions({ queryKey: ['catalog'], queryFn: api.catalog, staleTime: 10 * 60_000 })

/** Cours avec la maîtrise de chaque module (espace connecté). */
export const coursesQuery = queryOptions({ queryKey: ['courses'], queryFn: api.courses })

export const progressQuery = queryOptions({ queryKey: ['progress'], queryFn: api.progress })

export const profileQuery = queryOptions({ queryKey: ['profile'], queryFn: api.profile })

/** Exercices de l'atelier, hors module. */
export const sandboxQuery = queryOptions({ queryKey: ['sandbox'], queryFn: api.sandbox })

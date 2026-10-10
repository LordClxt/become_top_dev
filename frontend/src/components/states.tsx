import { ApiError } from '@/lib/api'

export function Loading({ label = 'Chargement…' }: { label?: string }) {
  return <p className="px-6 py-16 text-center text-muted">{label}</p>
}

export function ErrorState({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError && error.status === 404
      ? "Ce contenu n'existe pas (encore)."
      : error instanceof ApiError && error.status === 503
        ? "Le service d'exécution ne répond pas. Vérifie que le runner est lancé, puis réessaie."
        : "Impossible de charger cette page. Vérifie que l'API est lancée, puis recharge."
  return <p className="px-6 py-16 text-center text-fail">{message}</p>
}

import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { meQuery } from '@/features/auth/queries'

/** Durée de conservation d'un état en cours (quiz, paquet de cartes) : au-delà, on repart de zéro. */
const MAX_AGE_MS = 14 * 24 * 3600 * 1000

type Stored<T> = { v: T; at: number }

/**
 * État en cours d'un composant (quiz, paquet de cartes) conservé dans le navigateur, par compte : il reprend
 * après un rechargement. `snapshot` est enregistré à chaque changement,
 * et `restore` reçoit l'instantané enregistré une seule fois, dès que `ready` est vrai (données chargées).
 */
export function useSnapshot<T>(
  name: string | null,
  snapshot: T,
  ready: boolean,
  accept: (value: unknown) => value is T,
  restore: (value: T) => void,
) {
  const { data: me } = useQuery(meQuery)
  const uid = me?.user?.id
  const key = name && uid ? `btd:${uid}:${name}` : null
  const restoredFor = useRef<string | null>(null)

  useEffect(() => {
    if (!key || !ready || restoredFor.current === key) return
    restoredFor.current = key
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) return
      const stored = JSON.parse(raw) as Stored<unknown>
      if (Date.now() - stored.at > MAX_AGE_MS || !accept(stored.v)) {
        window.localStorage.removeItem(key)
        return
      }
      restore(stored.v)
    } catch {}
    // biome-ignore lint/correctness/useExhaustiveDependencies: une restauration par clé
  }, [key, ready])

  const serialized = JSON.stringify(snapshot)
  useEffect(() => {
    if (!key || restoredFor.current !== key) return
    try {
      window.localStorage.setItem(key, JSON.stringify({ v: JSON.parse(serialized), at: Date.now() }))
    } catch {}
  }, [key, serialized])
}

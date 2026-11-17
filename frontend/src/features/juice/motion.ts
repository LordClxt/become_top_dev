import { useSyncExternalStore } from 'react'
import { getSettings, useSettings } from '@/lib/settings'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false)
}

/** Animations « spectaculaires » autorisées : réglage Célébrations actif et mouvement non réduit. */
export function useJuiceEnabled(): boolean {
  const reduced = useReducedMotion()
  const { celebrations } = useSettings()
  return celebrations && !reduced
}

export function juiceEnabled(): boolean {
  return getSettings().celebrations && !prefersReducedMotion()
}

import { useEffect } from 'react'

export type XpGainKind =
  | 'lesson'
  | 'lab'
  | 'assignment'
  | 'boss'
  | 'project'
  | 'quiz'
  | 'checkpoint'
  | 'review'
  | 'quest'
  | 'chest'
  | 'bonus'

/**
 * Un gain d'XP annoncé par l'action qui l'a provoqué (leçon, TP, quiz).
 * `kind` permet à la couche de célébration de doser sa réaction ; `amount` peut valoir 0 si `kind` est fourni.
 */
export type XpGain = { amount: number; reason: string; kind?: XpGainKind; title?: string }

type Listener = (gain: XpGain) => void
const listeners = new Set<Listener>()

export function announceXp(gain: XpGain) {
  if (gain.amount <= 0 && !gain.kind) return
  for (const listen of listeners) listen(gain)
}

export function useXpGains(listen: Listener) {
  useEffect(() => {
    listeners.add(listen)
    return () => {
      listeners.delete(listen)
    }
  }, [listen])
}

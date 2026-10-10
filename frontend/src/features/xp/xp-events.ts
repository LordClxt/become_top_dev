import { useEffect } from 'react'

/** Un gain d'XP annoncé par l'action qui l'a provoqué (leçon, TP, quiz). */
export type XpGain = { amount: number; reason: string }

type Listener = (gain: XpGain) => void
const listeners = new Set<Listener>()

export function announceXp(gain: XpGain) {
  if (gain.amount <= 0) return
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

import { useQuery } from '@tanstack/react-query'
import { Sparkles, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { progressQuery } from '@/features/courses/queries'
import { useXpGains, type XpGain } from '@/features/xp/xp-events'
import { cn } from '@/lib/utils'

type ToastBody = { kind: 'xp'; gain: XpGain } | { kind: 'level'; level: number }
type Toast = ToastBody & { key: number }

const LIFETIME_MS = 2600

/**
 * Retour visible de chaque gain : une pastille « +30 XP » en bas à droite,
 * et une annonce plus marquée quand le niveau augmente (détecté sur la progression, pas déduit côté client).
 */
export function XpToaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const push = useCallback((toast: ToastBody) => {
    const key = ++seq.current
    setToasts((list) => [...list.slice(-2), { ...toast, key }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.key !== key)), LIFETIME_MS)
  }, [])

  useXpGains(useCallback((gain) => push({ kind: 'xp', gain }), [push]))

  const { data: progress } = useQuery(progressQuery)
  const lastLevel = useRef<number | null>(null)
  useEffect(() => {
    if (!progress) return
    if (lastLevel.current !== null && progress.level > lastLevel.current) push({ kind: 'level', level: progress.level })
    lastLevel.current = progress.level
  }, [progress, push])

  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-50 grid justify-items-end gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.key}
          className={cn(
            'xp-rise flex items-center gap-2.5 rounded-xl border px-4 py-2.5 shadow-[0_18px_40px_-20px_var(--accent)]',
            t.kind === 'level' ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface',
          )}
          style={{ animationDuration: `${LIFETIME_MS}ms` }}
        >
          {t.kind === 'xp' ? (
            <>
              <Sparkles className="size-4 text-accent" />
              <span className="font-code text-sm font-semibold text-accent tabular-nums">+{t.gain.amount} XP</span>
              <span className="text-sm text-muted">{t.gain.reason}</span>
            </>
          ) : (
            <>
              <TrendingUp className="size-4" />
              <span className="font-read text-lg font-semibold">Niveau {t.level} atteint</span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

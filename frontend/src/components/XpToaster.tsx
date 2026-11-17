import { Sparkles, TrendingUp } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { CelebrationLayer, type FallbackToast } from '@/components/celebrate/CelebrationLayer'
import { cn } from '@/lib/utils'

type Toast = FallbackToast & { key: number }

const LIFETIME_MS = 2600

/**
 * Point de montage unique du retour de réussite : la couche de célébration (pastilles volantes, moments centrés),
 * et, quand le mouvement est réduit ou les célébrations coupées, une simple pastille statique en bas à droite.
 */
export function XpToaster() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const push = useCallback((toast: FallbackToast) => {
    const key = ++seq.current
    setToasts((list) => [...list.slice(-2), { ...toast, key }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.key !== key)), LIFETIME_MS)
  }, [])

  return (
    <>
      <CelebrationLayer onFallback={push} />
      <div className="pointer-events-none fixed right-6 bottom-6 z-50 grid justify-items-end gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.key}
            className={cn(
              'xp-rise flex items-center gap-2.5 rounded-xl border px-4 py-2.5 shadow-[0_18px_40px_-20px_var(--accent)]',
              t.tone === 'strong' ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface',
            )}
            style={{ animationDuration: `${LIFETIME_MS}ms` }}
          >
            {t.tone === 'xp' ? <Sparkles className="size-4 text-accent" /> : <TrendingUp className="size-4" />}
            {t.amount ? (
              <span className={cn('font-code text-sm font-semibold tabular-nums', t.tone === 'xp' && 'text-accent')}>
                +{t.amount} XP
              </span>
            ) : null}
            <span className={cn('text-sm', t.tone === 'xp' ? 'text-muted' : 'font-medium')}>{t.text}</span>
          </div>
        ))}
      </div>
    </>
  )
}

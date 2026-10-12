import { cn } from '@/lib/utils'

/**
 * Motif signature : la progression dessinée comme une slice Go.
 * `len` = cases remplies (fait), `cap` = cases réservées (total).
 * `tone="fail"` : l'ambre d'échec, comme une capacité dépassée.
 */
export function SliceMeter({
  len,
  cap,
  size = 'md',
  tone = 'accent',
  label,
  className,
}: {
  len: number
  cap: number
  size?: 'sm' | 'md' | 'lg'
  tone?: 'accent' | 'fail'
  label?: string
  className?: string
}) {
  const cell = { sm: 'h-2.5 w-2.5', md: 'h-3.5 w-3.5', lg: 'h-5 w-5' }[size]
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className="flex gap-[3px]"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-valuenow={len}
        aria-label={label ?? `${len} sur ${cap}`}
      >
        {Array.from({ length: cap }, (_, i) => (
          <span
            key={i}
            className={cn(
              cell,
              'rounded-[2px] transition-colors duration-500',
              i < len ? (tone === 'fail' ? 'bg-fail' : 'bg-accent') : 'bg-cell-empty',
            )}
            style={{ transitionDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

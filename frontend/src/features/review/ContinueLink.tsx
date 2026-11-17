import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { TodayContinue } from '@/lib/api'

/** Lien vers la cible de « Continuer » (leçon, TP ou module), ou /learn sans cible. */
export function ContinueLink({ target, className, children }: { target: TodayContinue | null | undefined; className?: string; children: ReactNode }) {
  if (target?.type === 'lesson')
    return (
      <Link to="/lessons/$lessonId" params={{ lessonId: target.id }} className={className}>
        {children}
      </Link>
    )
  if (target?.type === 'exercise')
    return (
      <Link to="/exercises/$exerciseId" params={{ exerciseId: target.id }} className={className}>
        {children}
      </Link>
    )
  if (target?.type === 'chapter')
    return (
      <Link to="/chapters/$chapterId" params={{ chapterId: target.id }} className={className}>
        {children}
      </Link>
    )
  return (
    <Link to="/learn" className={className}>
      {children}
    </Link>
  )
}

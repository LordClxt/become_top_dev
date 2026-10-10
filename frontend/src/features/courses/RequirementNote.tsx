import type { CourseRequirement } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Pré-requis souple entre cours : on conseille, on ne bloque pas. */
export function RequirementNote({ requirement, className }: { requirement: CourseRequirement; className?: string }) {
  if (requirement.met) return null
  return (
    <p className={cn('border-l-2 border-fail pl-3 text-sm leading-relaxed text-muted', className)}>
      Conseillé après <span className="text-text">{requirement.course_title}</span>, jusqu'au module «&nbsp;
      {requirement.through_title}&nbsp;». {requirement.reason}
    </p>
  )
}

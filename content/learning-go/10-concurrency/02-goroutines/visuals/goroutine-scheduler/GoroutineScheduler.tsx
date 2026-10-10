import { lazy, Suspense, useEffect, useState } from 'react'
import { scenario } from './remotion/schedulerSim'

const STEPS = scenario()

export const id = 'go-ch10-goroutine-scheduler'

// Remotion n'est chargé que dans le navigateur, et seulement sur les pages qui affichent ce visuel.
const SchedulerPlayer = lazy(() => import('./remotion/SchedulerPlayer'))

export default function GoroutineScheduler() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const placeholder = (
    <div className="grid aspect-video w-full place-items-center rounded-xl bg-ink text-sm text-muted">
      Chargement de l’animation…
    </div>
  )

  return (
    <div>
      {mounted ? <Suspense fallback={placeholder}>{<SchedulerPlayer />}</Suspense> : placeholder}
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-text">Lire les {STEPS.length} étapes en texte</summary>
        <ol className="mt-3 grid list-decimal gap-1.5 pl-5">
          {STEPS.map((s) => (
            <li key={s.title}>
              <span className="font-medium">{s.title}.</span> <span className="text-muted">{s.detail}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  )
}

import { useQueries } from '@tanstack/react-query'
import { Hammer } from 'lucide-react'
import { SliceMeter } from '@/components/SliceMeter'
import { api, type Course, type CourseChapter } from '@/lib/api'
import { cn } from '@/lib/utils'
import { moduleXp } from './model'

type Available = Extract<CourseChapter, { available: true }>

/** Jauge : des cases tant qu'elles tiennent, une barre continue au-delà. */
function Gauge({ label, len, cap, unit }: { label: string; len: number; cap: number; unit?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-code text-xs tabular-nums">
          <span className="text-text">{len}</span>
          <span className="text-muted">
            {' '}
            / {cap}
            {unit}
          </span>
        </span>
      </div>
      {cap <= 24 ? (
        <SliceMeter len={len} cap={cap} size="sm" label={`${label} : ${len} sur ${cap}`} />
      ) : (
        <span
          className="block h-2.5 overflow-hidden rounded-[2px] bg-cell-empty"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={cap}
          aria-valuenow={len}
          aria-label={`${label} : ${len} sur ${cap}`}
        >
          <span
            className="block h-full bg-accent transition-[width] duration-(--dur-slow)"
            style={{ width: `${cap ? (len / cap) * 100 : 0}%` }}
          />
        </span>
      )}
    </div>
  )
}

/** Statistiques du cours et avancée du fil rouge, à partir du détail des modules écrits. */
export function CourseStats({ course }: { course: Course }) {
  const all = course.tracks.filter((t) => !t.optional).flatMap((t) => t.chapters)
  const available = course.tracks.flatMap((t) => t.chapters).filter((c): c is Available => c.available)
  const details = useQueries({
    queries: available.map((c) => ({
      queryKey: ['chapter', c.id],
      queryFn: () => api.chapter(c.id),
      staleTime: 30_000,
    })),
  })
  const loaded = details.every((d) => d.data)
  let xpWon = 0
  let xpTotal = 0
  let projectSteps = 0
  let projectDone = 0
  for (const d of details) {
    if (!d.data) continue
    const x = moduleXp(d.data)
    xpWon += x.won
    xpTotal += x.total
    if (d.data.project) {
      projectSteps++
      if (d.data.project.passed) projectDone++
    }
  }
  const mastered = available.filter((c) => c.mastery.mastered).length
  const lessonsDone = available.reduce((n, c) => n + c.mastery.lessons_done, 0)
  const lessonsTotal = available.reduce((n, c) => n + c.mastery.lessons_total, 0)
  const pending = all.length - all.filter((c) => c.available).length

  return (
    <>
      {available.length > 0 && (
        <section aria-label="Ta progression dans le cours" className="mt-9 grid max-w-[46ch] gap-4">
          <Gauge label="Modules maîtrisés" len={mastered} cap={available.length} />
          {lessonsTotal > 0 && <Gauge label="Leçons terminées" len={lessonsDone} cap={lessonsTotal} />}
          {loaded && xpTotal > 0 && (
            <div className="flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm text-muted">XP gagnés dans ce cours</span>
              <span className="font-code tabular-nums">
                <span className="text-lg text-accent">{xpWon}</span>
                <span className="text-xs text-muted"> / {xpTotal}</span>
              </span>
            </div>
          )}
          {pending > 0 && (
            <p className="text-xs text-muted">
              {pending} module{pending > 1 ? 's' : ''} encore en cours de rédaction.
            </p>
          )}
        </section>
      )}

      {course.running_project && (
        <section
          aria-labelledby="fil-rouge"
          className="mt-9 max-w-[46ch] rounded-2xl border border-line bg-surface/70 p-5"
        >
          <div className="flex items-start gap-4">
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-xl',
                projectDone > 0 ? 'bg-accent text-accent-ink' : 'bg-accent/12 text-accent',
              )}
            >
              <Hammer className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs tracking-wide text-muted uppercase">Fil rouge</p>
              <h2 id="fil-rouge" className="mt-0.5 font-read text-lg leading-snug font-semibold">
                {course.running_project.title}
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">{course.running_project.pitch}</p>
          {loaded && projectSteps > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="text-muted">Jalons construits</span>
                <span className="font-code text-xs tabular-nums">
                  {projectDone} / {projectSteps}
                </span>
              </div>
              <SliceMeter
                len={projectDone}
                cap={projectSteps}
                size="md"
                label={`${projectDone} jalons du projet sur ${projectSteps}`}
              />
              <p className="mt-2 text-xs text-muted">
                {projectDone === 0
                  ? 'Le premier jalon t’attend à la fin du premier module.'
                  : projectDone === projectSteps
                    ? 'Tous les jalons écrits sont en place.'
                    : 'Chaque module ajoute une pièce au projet.'}
              </p>
            </div>
          )}
        </section>
      )}
    </>
  )
}

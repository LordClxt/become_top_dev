import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, Code2, Workflow } from 'lucide-react'
import { GridZone } from '@/components/Backdrop'
import { ErrorState } from '@/components/states'
import { sandboxQuery } from '@/features/courses/queries'
import type { SandboxExercise } from '@/lib/api'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/sandbox')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(sandboxQuery),
  head: () => ({ meta: [{ title: 'Atelier · become_top_dev' }] }),
  errorComponent: ({ error }) => <ErrorState error={error} />,
  component: Sandbox,
})

const KIND: Record<string, { label: string; icon: typeof Workflow; text: string }> = {
  diagram: {
    label: 'Kata de diagramme',
    icon: Workflow,
    text: 'Pose des blocs, relie-les, puis vérifie : chaque règle dit ce qui manque.',
  },
}
const FALLBACK = { label: 'Exercice', icon: Code2, text: 'Un exercice libre, hors module.' }

function Sandbox() {
  const { data: exercises } = useSuspenseQuery(sandboxQuery)
  const done = exercises.filter((e) => e.passed).length

  return (
    <main className="relative isolate overflow-x-clip">
      <GridZone style={{ top: -140, right: -100 }} size={620} glow={{ x: -0.1, y: 0.05 }} />
      <div className="mx-auto max-w-[1100px] px-6 pt-12 pb-24">
        <h1 className="font-read text-5xl leading-tight font-semibold tracking-tight">Atelier</h1>
        <p className="mt-3 max-w-[56ch] font-read text-lg leading-relaxed text-muted">
          Des exercices hors module, pour s'entraîner à un format. Ils rapportent de l'XP mais n'ouvrent aucun module.
        </p>
        {exercises.length > 0 && (
          <p className="mt-4 font-code text-xs text-muted tabular-nums">
            len={done} cap={exercises.length}
          </p>
        )}

        {exercises.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-line p-8 text-muted">
            L'atelier est vide. Les exercices s'ajoutent dans <code className="font-code">content/&lt;livre&gt;/sandbox/</code>.
          </div>
        ) : (
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {exercises.map((ex) => (
              <li key={ex.id}>
                <SandboxCard exercise={ex} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

function SandboxCard({ exercise: ex }: { exercise: SandboxExercise }) {
  const kind = KIND[ex.kind] ?? FALLBACK
  return (
    <Link
      to="/exercises/$exerciseId"
      params={{ exerciseId: ex.id }}
      className={cn(
        'group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border bg-surface/80 p-6 backdrop-blur transition-colors duration-(--dur-fast)',
        ex.passed ? 'border-pass/50' : 'border-line hover:border-accent',
      )}
    >
      <span className="bg-grid pointer-events-none absolute -top-16 -right-16 -z-10 size-64" aria-hidden="true" />
      <span className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-sm text-accent">
          <kind.icon className="size-4" />
          {kind.label}
        </span>
        <span className="flex gap-[3px]" role="img" aria-label={`Difficulté ${ex.difficulty} sur 5`}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={cn('size-2.5 rounded-[2px]', i < ex.difficulty ? 'bg-accent' : 'bg-cell-empty')} />
          ))}
        </span>
      </span>
      <span className="mt-4 font-read text-2xl leading-snug font-semibold group-hover:text-accent">{ex.title}</span>
      <span className="mt-1 text-sm text-muted">
        {ex.course.title}
        {ex.source && `, chapitre ${ex.source.chapter}`}
      </span>
      <span className="mt-3 text-sm leading-relaxed text-muted">{kind.text}</span>
      <span className="mt-auto flex items-center justify-between gap-4 pt-6 text-sm">
        {ex.passed ? (
          <span className="flex items-center gap-1.5 text-pass">
            <Check className="size-4" /> Réussi
          </span>
        ) : (
          <span className="text-muted">
            {ex.attempts > 0 ? `${ex.attempts} essai${ex.attempts > 1 ? 's' : ''}` : 'Pas encore tenté'}
          </span>
        )}
        <span className={cn('font-code text-xs', ex.passed ? 'text-muted' : 'text-accent')}>
          {ex.passed ? `${ex.xp} XP obtenus` : `+${ex.xp} XP`}
        </span>
      </span>
    </Link>
  )
}

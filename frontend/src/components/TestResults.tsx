import { Check, ChevronRight, Circle, Sparkles, TrendingUp, X } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import type { RunReport, TestCase } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Résultat d'une exécution. `diagram` : les « tests » sont les règles d'un kata de diagramme.
 * `previous` : l'essai précédent de cette session, pour montrer le progrès d'un essai à l'autre.
 * `action` : le bouton d'étape suivante, affiché dans le bandeau de réussite.
 */
export function TestResults({
  report,
  previous,
  running,
  diagram = false,
  sheet = false,
  action,
}: {
  report?: RunReport
  previous?: RunReport
  running: boolean
  diagram?: boolean
  sheet?: boolean
  action?: ReactNode
}) {
  const noCode = diagram || sheet
  if (running) return <Running diagram={diagram} sheet={sheet} />
  if (!report) {
    return (
      <p className="p-4 text-sm text-muted">
        {sheet
          ? 'Vérifie tes réponses pour voir ici ce qui est juste et ce qui reste à revoir.'
          : diagram
            ? 'Vérifie le diagramme pour voir ici chaque règle respectée ou non.'
            : 'Lance les tests pour voir le résultat ici. Raccourci : ⌘ + Entrée.'}
      </p>
    )
  }
  const unit = (n: number) => (sheet ? `point${n > 1 ? 's' : ''}` : diagram ? `règle${n > 1 ? 's' : ''}` : `test${n > 1 ? 's' : ''}`)

  const topLevel = topLevelTests(report)
  const passCount = topLevel.filter((t) => t.status === 'pass').length
  const failedTop = topLevel.filter((t) => t.status === 'fail')
  const firstFail = report.tests.find((t) => t.status === 'fail')
  const compileError = !!report.build_output && topLevel.length === 0
  const bonuses = report.bonuses ?? []

  // Progrès depuis l'essai précédent (sur les tests de premier niveau).
  let delta: ReactNode = null
  if (!report.passed && previous && !compileError) {
    const before = topLevelTests(previous).filter((t) => t.status === 'pass').length
    const diff = passCount - before
    delta =
      diff > 0 ? (
        <span className="flex items-center gap-1.5 text-pass">
          <TrendingUp className="size-3.5" />
          {diff} {unit(diff)} de plus qu’au dernier essai
        </span>
      ) : diff === 0 ? (
        <span className="text-muted">Même résultat : regarde le premier {unit(1)} en échec.</span>
      ) : (
        <span className="text-fail">
          {-diff} {unit(-diff)} de moins qu’au dernier essai : ta dernière modification a cassé quelque chose.
        </span>
      )
  }

  return (
    <div className="p-4 text-sm">
      {report.passed && (
        <div className="juice-pass relative isolate mb-4 overflow-hidden rounded-xl border border-pass/50 bg-pass/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="juice-pop grid size-9 shrink-0 place-items-center rounded-lg bg-pass text-ink">
              <Check className="size-5" strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-pass">
                {topLevel.length} {unit(topLevel.length)} sur {topLevel.length}{' '}
                {sheet ? (topLevel.length > 1 ? 'justes' : 'juste') : diagram ? `respectée${topLevel.length > 1 ? 's' : ''}` : 'au vert'}
              </span>
              <span className="text-muted">
                {report.xp_awarded > 0 ? 'L’XP est ajoutée à ton niveau.' : 'Déjà réussi : pas d’XP en plus cette fois.'}
              </span>
            </span>
            {report.xp_awarded > 0 && (
              <span className="font-code text-base font-semibold text-accent tabular-nums">+{report.xp_awarded} XP</span>
            )}
            {action}
          </div>
          {bonuses.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 border-t border-pass/25 pt-3">
              {bonuses.map((b, i) => (
                <li
                  key={b.id}
                  className="juice-pop flex items-center gap-1.5 rounded-full border border-accent/60 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent"
                  style={{ animationDelay: `${300 + i * 120}ms` }}
                >
                  <Sparkles className="size-3" />
                  {b.label}
                  <span className="font-code">+{b.xp}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {topLevel.length > 0 && (
          <span className="flex items-center gap-2.5">
            <span className="flex flex-wrap gap-[3px]" aria-hidden="true">
              {topLevel.map((t, i) => (
                <span
                  key={t.name}
                  className={cn('juice-cell-in h-3.5 w-3 rounded-[2px]', t.status === 'pass' ? 'bg-pass' : t.status === 'fail' ? 'bg-fail' : 'bg-cell-empty')}
                  style={{ animationDelay: `${i * 45}ms` }}
                />
              ))}
            </span>
            <span className={cn('font-code font-semibold tabular-nums', report.passed ? 'text-pass' : 'text-text')}>
              {passCount}/{topLevel.length}
            </span>
          </span>
        )}
        <p className={report.passed ? 'font-medium text-pass' : 'font-medium text-fail'}>
          {report.timed_out
            ? 'Temps écoulé : ton code ne s’est pas terminé à temps (boucle infinie ?).'
            : report.passed
              ? sheet
                ? 'Toutes tes réponses sont justes.'
                : diagram
                  ? 'Toutes les règles sont respectées.'
                  : 'Tous les tests passent.'
              : compileError
                ? 'Le code ne compile pas.'
                : `${failedTop.length || 1} ${unit(failedTop.length || 1)} ${sheet ? 'à revoir' : diagram ? `non respectée${failedTop.length > 1 ? 's' : ''}` : 'en échec'}.`}
          {!noCode && <span className="ml-2 font-normal text-muted">{(report.duration_ms / 1000).toFixed(1)} s</span>}
        </p>
        {delta && <p className="text-sm">{delta}</p>}
      </div>

      {report.build_output && (
        <pre className="mt-3 overflow-x-auto rounded-md bg-surface-2 p-3 font-code text-xs leading-relaxed whitespace-pre-wrap text-fail">
          {report.build_output}
        </pre>
      )}

      <ul className="mt-3 grid gap-1">
        {report.tests.map((t) => (
          <TestRow key={t.name} test={t} noCode={noCode} first={t === firstFail} />
        ))}
      </ul>
    </div>
  )
}

export function topLevelTests(report: RunReport): TestCase[] {
  return report.tests.filter((t) => !t.name.includes('/'))
}

/** Le premier échec est déplié et mis en avant ; les autres sorties se déplient au clic. */
function TestRow({ test: t, noCode, first }: { test: TestCase; noCode: boolean; first: boolean }) {
  const [open, setOpen] = useState(first)
  const nested = !noCode && t.name.includes('/')
  const label = noCode ? t.name : t.name.split('/').at(-1)?.replaceAll('_', ' ')
  const icon =
    t.status === 'pass' ? (
      <Check className="size-3.5 shrink-0 text-pass" />
    ) : t.status === 'fail' ? (
      <X className="size-3.5 shrink-0 text-fail" />
    ) : (
      <Circle className="size-3.5 shrink-0 text-muted" />
    )
  const text = noCode ? 'text-sm' : 'font-code text-xs'
  const expandable = !!t.output && t.status === 'fail'

  return (
    <li className={cn(nested && 'pl-6', first && 'my-1 rounded-lg border border-fail/40 bg-fail/8 p-2.5')}>
      {expandable ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={cn('flex w-full items-center gap-2 text-left hover:text-text', text)}
        >
          {icon}
          <span className="min-w-0 flex-1">{label}</span>
          {first && <span className="font-sans text-[11px] font-medium tracking-wide text-fail uppercase">Commence ici</span>}
          <ChevronRight className={cn('size-3.5 shrink-0 text-muted transition-transform', open && 'rotate-90')} />
        </button>
      ) : (
        <span className={cn('flex items-center gap-2', text)}>
          {icon}
          {label}
        </span>
      )}
      {t.output &&
        (open || !expandable) &&
        (noCode ? (
          <p className="mt-0.5 ml-5.5 text-sm text-fail/90">{t.output}</p>
        ) : (
          <pre className={cn('mt-1 ml-5.5 font-code text-xs leading-relaxed whitespace-pre-wrap', first ? 'text-text' : 'text-muted')}>
            {t.output}
          </pre>
        ))}
    </li>
  )
}

/** Pendant l'exécution : les étapes défilent (compilation, puis tests) au lieu d'une phrase figée. */
function Running({ diagram, sheet }: { diagram: boolean; sheet: boolean }) {
  const steps = sheet ? ['Correction de tes réponses'] : diagram ? ['Vérification des règles'] : ['Compilation', 'Exécution des tests']
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (steps.length < 2) return
    // La compilation domine en général les premières secondes d'un essai dans la sandbox.
    const id = setTimeout(() => setStep(1), 1400)
    return () => clearTimeout(id)
  }, [steps.length])

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-sm" role="status">
      {steps.map((s, i) => (
        <span key={s} className={cn('flex items-center gap-2.5', i > step ? 'text-muted/60' : i < step ? 'text-muted' : 'text-text')}>
          {i < step ? (
            <Check className="size-3.5 text-pass" />
          ) : (
            <span className="flex gap-[3px]" aria-hidden="true">
              {[0, 1, 2, 3].map((k) => (
                <span
                  key={k}
                  className={cn('h-3 w-2 rounded-[2px] bg-cell-empty', i === step && 'juice-run-step')}
                  style={{ ['--i' as string]: k }}
                />
              ))}
            </span>
          )}
          {s}
          {i === step && <span className="text-muted">…</span>}
        </span>
      ))}
    </div>
  )
}

import { Check, Circle, X } from 'lucide-react'
import type { RunReport } from '@/lib/api'

/** Résultat d'une exécution. `diagram` : les « tests » sont les règles d'un kata de diagramme. */
export function TestResults({
  report,
  running,
  diagram = false,
  sheet = false,
}: {
  report?: RunReport
  running: boolean
  diagram?: boolean
  sheet?: boolean
}) {
  const noCode = diagram || sheet
  if (running) {
    return (
      <p className="p-4 text-sm text-muted">
        {sheet ? 'Correction de tes réponses…' : diagram ? 'Vérification des règles…' : 'Compilation et exécution des tests dans la sandbox…'}
      </p>
    )
  }
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

  const failed = report.tests.filter((t) => t.status === 'fail')
  const topLevel = report.tests.filter((t) => !t.name.includes('/'))

  return (
    <div className="p-4 text-sm">
      {report.passed && (
        <div className="relative isolate mb-4 flex items-center gap-4 overflow-hidden rounded-xl border border-pass/50 bg-pass/10 px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-pass text-ink">
            <Check className="size-5" strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-pass">
              {topLevel.length} {unit(topLevel.length)} sur {topLevel.length} {sheet ? (topLevel.length > 1 ? 'justes' : 'juste') : diagram ? `respectée${topLevel.length > 1 ? 's' : ''}` : 'au vert'}
            </span>
            <span className="text-muted">
              {report.xp_awarded > 0 ? 'L’XP est ajoutée à ton niveau.' : 'Déjà réussi : pas d’XP en plus cette fois.'}
            </span>
          </span>
          {report.xp_awarded > 0 && (
            <span className="font-code text-base font-semibold text-accent">+{report.xp_awarded} XP</span>
          )}
        </div>
      )}
      <p className={report.passed ? 'font-medium text-pass' : 'font-medium text-fail'}>
        {report.timed_out
          ? 'Temps écoulé : ton code ne s’est pas terminé à temps (boucle infinie ?).'
          : report.passed
            ? `${sheet ? 'Toutes tes réponses sont justes.' : diagram ? 'Toutes les règles sont respectées.' : 'Tous les tests passent.'}${report.xp_awarded > 0 ? ` +${report.xp_awarded} XP` : ''}`
            : report.build_output && topLevel.length === 0
              ? 'Le code ne compile pas.'
              : `${failed.length} ${unit(failed.length)} ${sheet ? 'à revoir' : diagram ? `non respectée${failed.length > 1 ? 's' : ''}` : 'en échec'}.`}
        {!noCode && <span className="ml-2 font-normal text-muted">{(report.duration_ms / 1000).toFixed(1)} s</span>}
      </p>

      {report.build_output && (
        <pre className="mt-3 overflow-x-auto rounded-md bg-surface-2 p-3 font-code text-xs leading-relaxed whitespace-pre-wrap text-fail">
          {report.build_output}
        </pre>
      )}

      <ul className="mt-3 grid gap-1.5">
        {report.tests.map((t) => (
          <li key={t.name} className={!noCode && t.name.includes('/') ? 'pl-6' : ''}>
            <span className={noCode ? 'flex items-center gap-2 text-sm' : 'flex items-center gap-2 font-code text-xs'}>
              {t.status === 'pass' ? (
                <Check className="size-3.5 text-pass" />
              ) : t.status === 'fail' ? (
                <X className="size-3.5 text-fail" />
              ) : (
                <Circle className="size-3.5 text-muted" />
              )}
              {noCode ? t.name : t.name.split('/').at(-1)?.replaceAll('_', ' ')}
            </span>
            {t.output && (
              noCode ? (
                <p className="mt-0.5 ml-5.5 text-sm text-fail/90">{t.output}</p>
              ) : (
                <pre className="mt-1 ml-5.5 font-code text-xs leading-relaxed whitespace-pre-wrap text-muted">
                  {t.output}
                </pre>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

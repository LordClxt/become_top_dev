import type { CSSProperties } from 'react'
import type { CatalogCourse } from '@/lib/api'
import { countModules } from '@/features/courses/summary'

/**
 * Hero de la page d'accueil : la suite de tests de chaque fil rouge s'exécute, ses cellules se remplissent
 * (le motif slice len/cap), puis la ligne passe de « en cours » à « validé ». Une seule séquence, jouée une fois.
 * Les instants sont précalculés ici et passés en variables CSS : aucune mesure du DOM, aucun JS d'animation.
 */

const LEAD_IN = 0.5 // s, avant la première ligne
const ROW = 1.35 // s, écart entre deux cours
const FILL = 0.95 // s, pour remplir toutes les cellules d'une ligne

const delay = (s: number) => ({ '--d': `${s.toFixed(2)}s` }) as CSSProperties

export function TestRun({ courses }: { courses: CatalogCourse[] }) {
  const rows = courses.map((course, i) => {
    const start = LEAD_IN + i * ROW
    return { course, start, pass: start + FILL + 0.15, modules: countModules(course).total }
  })
  const end = LEAD_IN + rows.length * ROW + 0.1
  const totalModules = rows.reduce((n, r) => n + r.modules, 0)

  return (
    <figure
      className="rounded-xl border border-line bg-surface/80 p-5 font-code text-[13px] leading-relaxed shadow-[0_30px_80px_-40px_var(--accent)] backdrop-blur sm:p-7"
      aria-label={`Exemple : les ${rows.length} cours se valident, ${totalModules} modules au total.`}
    >
      <p className="truncate text-muted" aria-hidden="true">
        <span className="text-accent">$</span> valider mes cours
      </p>

      <ol className="mt-5 grid gap-5" aria-hidden="true">
        {rows.map(({ course, start, pass, modules }) => (
          <li key={course.id}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="grid">
                <span className="run-appear run-vanish col-start-1 row-start-1 text-muted" style={{ ...delay(start), '--v': `${pass.toFixed(2)}s` } as CSSProperties}>
                  en cours…
                </span>
                <span className="run-appear col-start-1 row-start-1 text-pass" style={delay(pass)}>
                  validé
                </span>
              </span>
              <span className="run-appear shrink-0 text-muted tabular-nums" style={delay(pass)}>
                {modules}/{modules}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-[3px]">
              {Array.from({ length: modules }, (_, k) => (
                <span
                  key={k}
                  className="run-cell size-3 rounded-[2px]"
                  style={delay(start + 0.1 + (k * FILL) / modules)}
                />
              ))}
            </div>
            <p className="run-appear mt-2 font-ui text-sm text-text" style={delay(start)}>
              {course.title}
              <span className="text-muted"> · {course.running_project?.title.split(/\s[—-]\s/)[0] ?? course.book.title}</span>
            </p>
          </li>
        ))}
      </ol>

      <p className="run-appear mt-6 border-t border-line pt-4 text-pass" style={delay(end)} aria-hidden="true">
        {rows.length} cours, {totalModules} modules
      </p>
    </figure>
  )
}

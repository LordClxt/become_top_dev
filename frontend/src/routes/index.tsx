import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Clapperboard } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { BrandMark } from '@/components/AppHeader'
import { GridZone } from '@/components/Backdrop'
import { Button } from '@/components/ui/button'
import { meQuery } from '@/features/auth/queries'
import { catalogQuery } from '@/features/courses/queries'
import { RequirementNote } from '@/features/courses/RequirementNote'
import { countModules, plural } from '@/features/courses/summary'
import { ModuleLoop } from '@/features/landing/ModuleLoop'
import { ProgressPreview } from '@/features/landing/ProgressPreview'
import { ScrollRail } from '@/features/landing/ScrollRail'
import { TestRun } from '@/features/landing/TestRun'
import type { CatalogCourse } from '@/lib/api'
import { useReveal } from '@/lib/use-reveal'
import { cn } from '@/lib/utils'
import { visualComponents } from '@/visuals/registry'

export const Route = createFileRoute('/')({
  // Page publique : si le backend ne répond pas, elle s'affiche quand même, sans la liste des cours.
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(catalogQuery).catch(() => null),
      queryClient.ensureQueryData(meQuery).catch(() => null),
    ]),
  component: Landing,
})

const SHOWCASE_VISUAL = 'go-ch10-goroutine-scheduler'

const SECTIONS = [
  { id: 'debut', label: 'Début' },
  { id: 'boucle', label: 'Un module' },
  { id: 'cours', label: 'Les cours' },
  { id: 'visuels', label: 'Les visuels' },
  { id: 'progression', label: 'La progression' },
]

function Landing() {
  const { data: courses } = useQuery({ ...catalogQuery, enabled: false })
  const { data: me } = useQuery({ ...meQuery, enabled: false })
  const signedIn = me?.authenticated === true
  const Showcase = visualComponents[SHOWCASE_VISUAL]

  const cta = (
    <Button asChild size="lg" className="h-12 rounded-xl px-6 text-base">
      <Link to={signedIn ? '/learn' : '/login'}>{signedIn ? 'Reprendre mes cours' : 'Se connecter'}</Link>
    </Button>
  )

  return (
    <div className="relative isolate overflow-x-clip">
      <ScrollRail sections={SECTIONS} />
      <GridZone style={{ top: -160, right: -120 }} size={760} glow={{ x: -0.05, y: 0.1 }} />

      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-read text-lg font-semibold tracking-tight">
          <BrandMark />
          become_top_dev
        </Link>
        <Link
          to={signedIn ? '/learn' : '/login'}
          className="rounded-md px-3 py-2 text-sm text-muted transition-colors duration-(--dur-fast) hover:bg-surface-2 hover:text-text"
        >
          {signedIn ? 'Mes cours' : 'Se connecter'}
        </Link>
      </header>

      <main>
        <section
          id="debut"
          className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-6 pt-14 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:pt-24 lg:pb-32"
        >
          <div>
            <h1 className="max-w-[18ch] font-read text-[clamp(2.6rem,5.4vw,4.4rem)] leading-[1.04] font-semibold tracking-[-0.02em] text-balance">
              Apprends à coder en pratiquant.
            </h1>
            <p className="mt-7 max-w-[46ch] font-read text-xl leading-relaxed text-muted">
              Trois cours tirés de livres de référence : Go, systèmes de données, architecture logicielle. Tu lis, tu
              codes, tu passes les tests, puis tu avances.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              {cta}
              {courses && (
                <a href="#cours" className="text-sm text-muted underline-offset-4 hover:text-text hover:underline">
                  Voir les {courses.length} cours
                </a>
              )}
            </div>
          </div>

          {courses && courses.length > 0 && <TestRun courses={courses} />}
        </section>

        <Section id="boucle" title="Un module, quatre gestes">
          <p className="mt-3 max-w-[60ch] text-muted">
            Chaque geste rapporte de l'XP. Le module suivant s'ouvre quand tu maîtrises celui-ci.
          </p>
          <ModuleLoop />
        </Section>

        {courses && courses.length > 0 && (
          <Section id="cours" title="Trois cours">
            <p className="mt-3 max-w-[60ch] text-muted">
              Commence par Go : les exercices des deux autres cours s'écrivent en Go. Chaque cours a un projet fil
              rouge qui grandit à chaque module.
            </p>
            <ol className="mt-12 border-t border-line">
              {courses.map((course, i) => (
                <CatalogRow key={course.id} course={course} rank={i + 1} />
              ))}
            </ol>
          </Section>
        )}

        {Showcase && (
          <Section id="visuels" title="Comprendre en voyant">
            <div className="mt-3 grid gap-x-16 gap-y-4 lg:grid-cols-[minmax(0,60ch)_1fr]">
              <p className="text-muted">
                Les idées difficiles ont leur animation, à regarder ou à manipuler. Exemple : comment Go répartit cinq
                tâches sur deux processeurs, étape par étape.
              </p>
            </div>
            <figure className="relative isolate mt-10 overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="bg-grid pointer-events-none absolute -top-24 -right-24 -z-10 size-96" aria-hidden="true" />
              <figcaption className="flex items-center gap-2 border-b border-line px-5 py-3 text-sm">
                <Clapperboard className="size-4 text-accent" />
                <span className="font-medium">Le scheduler de Go</span>
                <span className="text-muted">du module Concurrence</span>
              </figcaption>
              <div className="p-5">
                <Showcase />
              </div>
            </figure>
          </Section>
        )}

        <Section id="progression" title="Ta progression, en clair">
          <p className="mt-3 max-w-[60ch] text-muted">
            Niveaux, série de jours, boss en fin de module, badges. Voici un profil après quelques semaines.
          </p>
          <ProgressPreview />
        </Section>

        <section className="border-t border-line">
          <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-6 py-20 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[40ch] font-read text-2xl leading-snug">
              {signedIn ? 'Ta progression t’attend là où tu l’as laissée.' : 'Un espace privé, un seul mot de passe.'}
            </p>
            {cta}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-[1200px] px-6 py-8 text-sm text-muted">
          Contenus reformulés à partir des livres cités ; chaque leçon indique le chapitre et les pages d'origine.
        </p>
      </footer>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-line">
      <div className="mx-auto max-w-[1200px] px-6 py-24">
        <h2 className="max-w-[24ch] font-read text-[clamp(1.9rem,3vw,2.5rem)] leading-tight font-semibold tracking-tight">
          {title}
        </h2>
        {children}
      </div>
    </section>
  )
}

const at = (s: number) => ({ '--d': `${s.toFixed(2)}s` }) as CSSProperties

function CatalogRow({ course, rank }: { course: CatalogCourse; rank: number }) {
  const { total, written } = countModules(course)
  const reveal = useReveal<HTMLLIElement>(0.45)
  const chapters = course.tracks.flatMap((t) => t.chapters)

  return (
    <li
      {...reveal}
      className="grid grid-cols-1 gap-6 border-b border-line py-12 lg:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-12"
    >
      {/* Ordre conseillé : un vrai rang, pas une décoration. */}
      <span className="font-code text-sm text-muted tabular-nums lg:pt-2">{rank}</span>
      <div>
        <h3 className="font-read text-2xl font-semibold tracking-tight">{course.title}</h3>
        <p className="mt-1 text-sm text-muted">
          D'après <em className="font-read">{course.book.title}</em>, {course.book.authors.join(' et ')}
        </p>
        <p className="mt-4 max-w-[52ch] leading-relaxed">{course.summary}</p>
        {course.requires.map((req) => (
          <RequirementNote key={req.course_id} requirement={req} className="mt-4 max-w-[52ch]" />
        ))}
      </div>
      <div className="lg:pt-1">
        {course.running_project && (
          <>
            <p className="font-medium">{course.running_project.title}</p>
            <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-muted">{course.running_project.pitch}</p>
          </>
        )}
        <div
          className="mt-6 flex flex-wrap gap-[3px]"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={written}
          aria-label={`${written} modules rédigés sur ${total}`}
        >
          {chapters.map((ch, i) => (
            <span
              key={ch.slug}
              title={ch.title}
              className={cn('size-3.5 rounded-[2px]', ch.available ? 'reveal-cell bg-accent' : 'bg-cell-empty')}
              style={at(0.15 + i * 0.06)}
            />
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          <span className="font-code text-xs tabular-nums">
            len={written} cap={total}
          </span>
          <span className="mx-2 text-line" aria-hidden="true">
            /
          </span>
          {plural(total, 'module', 'modules')} en {plural(course.tracks.length, 'parcours', 'parcours')},{' '}
          {written === 0 ? 'rédaction en cours' : plural(written, 'déjà prêt', 'déjà prêts')}
        </p>
      </div>
    </li>
  )
}

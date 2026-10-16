import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clapperboard,
  FlaskConical,
  Layers,
  ListChecks,
  type LucideIcon,
  Play,
  Quote,
  Swords,
  TerminalSquare,
  Trophy,
} from 'lucide-react'
import { MotionConfig, motion, useScroll, useTransform } from 'motion/react'
import { type CSSProperties, type ReactNode, useRef } from 'react'
import { BrandMark } from '@/components/AppHeader'
import { CourseBooks } from '@/components/CourseBooks'
import { meQuery } from '@/features/auth/queries'
import { catalogQuery } from '@/features/courses/queries'
import { RequirementNote } from '@/features/courses/RequirementNote'
import { countModules, plural } from '@/features/courses/summary'
import { CrossBands } from '@/features/landing/Marquee'
import { CountUp, EASE, Eyebrow, RevealWords, Spark } from '@/features/landing/motion'
import { ProgressPreview } from '@/features/landing/ProgressPreview'
import { scenes } from '@/features/landing/scenes'
import type { CatalogCourse } from '@/lib/api'
import { useReveal } from '@/lib/use-reveal'
import { cn } from '@/lib/utils'
import { visualComponents } from '@/visuals/registry'
import { SceneLoop } from '@/visuals/SceneLoop'

export const Route = createFileRoute('/')({
  // Page publique : si le backend ne répond pas, elle s'affiche quand même, sans la liste des cours.
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(catalogQuery).catch(() => null),
      queryClient.ensureQueryData(meQuery).catch(() => null),
    ]),
  component: Landing,
})

const SHOWCASE_VISUAL = 'java-ch01-stack-leak'

const NAV = [
  { href: '#methode', label: 'La méthode' },
  { href: '#cours', label: 'Les cours' },
  { href: '#visuels', label: 'Les visuels' },
  { href: '#progression', label: 'La progression' },
]

const TOPICS = ['Tests au vert', 'Concurrence', 'Katas d’architecture']

const display = 'font-display font-extrabold uppercase leading-[0.86] tracking-[-0.01em]'
// display en dernier : tailwind-merge retirerait leading-[0.86] derrière une taille text-[…].
const sectionTitle = cn('mt-5 text-[clamp(2.8rem,5.6vw,5.2rem)]', display)

/** Bouton pilule : libellé + pastille ronde. Ses couleurs suivent le bloc (jetons accent). */
function Pill({ to, href, children, variant = 'solid' }: { to?: string; href?: string; children: ReactNode; variant?: 'solid' | 'outline' }) {
  const className = cn(
    'group/pill inline-flex h-12 shrink-0 items-center whitespace-nowrap gap-3 rounded-full pr-1.5 pl-6 text-[15px] font-semibold transition-transform duration-(--dur-fast) hover:-translate-y-0.5',
    variant === 'solid' ? 'bg-accent text-accent-ink' : 'border border-current/40 hover:border-current',
  )
  const dot = (
    <span
      className={cn(
        'grid size-9 place-items-center rounded-full transition-transform duration-(--dur-base) group-hover/pill:rotate-45',
        variant === 'solid' ? 'bg-accent-ink text-accent' : 'bg-accent text-accent-ink',
      )}
    >
      <ArrowUpRight className="size-4" aria-hidden="true" />
    </span>
  )
  if (href)
    return (
      <a href={href} className={className}>
        {children}
        {dot}
      </a>
    )
  return (
    <Link to={to} className={className}>
      {children}
      {dot}
    </Link>
  )
}

function Landing() {
  const { data: courses } = useQuery({ ...catalogQuery, enabled: false })
  const { data: me } = useQuery({ ...meQuery, enabled: false })
  const signedIn = me?.authenticated === true
  const Showcase = visualComponents[SHOWCASE_VISUAL]
  const target = signedIn ? '/learn' : '/login'
  const ctaLabel = signedIn ? 'Reprendre mes cours' : 'Se connecter'
  const list = courses ?? []

  return (
    <MotionConfig reducedMotion="user">
      <div className="lp relative isolate overflow-x-clip">
        <Hero courses={list} signedIn={signedIn} target={target} ctaLabel={ctaLabel} />

        <CrossBands items={[...list.map((c) => c.title), ...TOPICS]} />

        <MethodSection />

        <WhySection />

        {list.length > 0 && <CoursesSection courses={list} signedIn={signedIn} />}

        {Showcase && (
          <section id="visuels" className="lp-blue relative scroll-mt-8 overflow-hidden">
            <div className="lp-grid pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="relative mx-auto max-w-[1320px] px-6 py-28">
              <SectionHead
                eyebrow="Les visuels"
                title="Comprendre en voyant"
                aside="Les idées difficiles ont leur animation. Ici, une pile Java qui fuit : on voit quels objets le ramasse-miettes ne peut plus libérer."
              />
              <motion.figure
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.8, ease: EASE }}
                className="lp-ink relative mt-14 overflow-hidden rounded-[2rem] border border-line shadow-[0_50px_100px_-40px_rgb(0_0_0/0.7)]"
              >
                <figcaption className="flex items-center gap-2 border-b border-line px-6 py-4 text-sm">
                  <Clapperboard className="size-4 text-accent" aria-hidden="true" />
                  <span className="font-medium">La fuite de mémoire d’une pile</span>
                  <span className="text-muted">du module Créer et détruire des objets</span>
                </figcaption>
                <div className="p-6">
                  <Showcase />
                </div>
              </motion.figure>
            </div>
          </section>
        )}

        <section id="progression" className="scroll-mt-8">
          <div className="mx-auto max-w-[1320px] px-6 py-28">
            <SectionHead
              eyebrow="La progression"
              title="Ta progression, en clair"
              aside="Niveaux, série de jours, boss en fin de module, badges. Voici un profil après quelques semaines."
            />
            <ProgressPreview />
          </div>
        </section>

        <FinalCta signedIn={signedIn} target={target} ctaLabel={ctaLabel} />

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-6 pt-12 md:flex-row md:items-start md:justify-between">
            <Link to="/" className="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-wide uppercase">
              <BrandMark />
              become_top_dev
            </Link>
            <p className="max-w-[52ch] text-sm text-muted">
              Contenus reformulés à partir des livres cités ; chaque leçon indique le chapitre et les pages d'origine.
            </p>
          </div>
          {/* Le mot-symbole en contour, coupé par le bas de la page comme une signature. */}
          <p
            className={cn('text-outline -mb-[0.12em] overflow-hidden pt-10 text-center text-[15.5vw] whitespace-nowrap select-none', display)}
            aria-hidden="true"
          >
            become_top_dev
          </p>
        </footer>
      </div>
    </MotionConfig>
  )
}

// --- Hero ----------------------------------------------------------------------

function Hero({ courses, signedIn, target, ctaLabel }: { courses: CatalogCourse[]; signedIn: boolean; target: string; ctaLabel: string }) {
  const modules = courses.reduce((n, c) => n + countModules(c).total, 0)
  const books = new Set(courses.flatMap((c) => [c.book.slug, ...(c.books ?? []).map((b) => b.slug)])).size
  const stats = [
    { value: courses.length, label: 'cours complets' },
    { value: modules, label: 'modules à maîtriser' },
    { value: books, label: 'livres de référence' },
  ].filter((s) => s.value > 0)

  // Une seule séquence au chargement : les deux lignes du titre montent, puis l'illustration se pose.
  const line = (i: number) => ({
    initial: { y: '105%' },
    animate: { y: 0 },
    transition: { duration: 0.8, delay: 0.1 + i * 0.12, ease: EASE },
  })
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  })

  return (
    <section className="lp-blue relative overflow-hidden">
      <div className="lp-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      <header className="relative z-30 mx-auto flex h-20 max-w-[1320px] items-center justify-between gap-6 px-6">
        <Link to="/" className="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-wide uppercase">
          <BrandMark />
          become_top_dev
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections de la page">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors duration-(--dur-fast) hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Pill to={target}>{signedIn ? 'Mes cours' : 'Se connecter'}</Pill>
      </header>

      <div className="relative mx-auto max-w-[1320px] px-6 pt-4 pb-32 lg:pb-36">
        {/* Pastille tournante, comme un tampon d'affiche. */}
        <motion.span
          {...rise(0.6)}
          className="absolute top-2 right-6 hidden size-28 place-items-center rounded-full border-2 border-(--brand-lime) text-(--brand-lime) xl:grid"
          aria-hidden="true"
        >
          <Spark className="spin-slow size-12" />
        </motion.span>

        <h1 className={cn('text-center text-[clamp(4.2rem,14vw,13.5rem)] text-(--brand-lime)', display)}>
          <span className="block overflow-hidden pb-[0.04em]">
            <motion.span className="block" {...line(0)}>
              Apprends
            </motion.span>
          </span>
          <span className="block overflow-hidden pb-[0.04em]">
            <motion.span className="text-stroke-lime block" {...line(1)}>
              en codant.
            </motion.span>
          </span>
        </h1>

        <div className="relative grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)_18rem] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 70, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.35, ease: EASE }}
            className="relative z-10 mx-auto -mt-[4vw] w-full max-w-[600px] lg:col-start-2 lg:row-start-1 lg:-mt-40"
          >
            <div className="lp-halo absolute inset-[12%] -z-10" aria-hidden="true" />
            <SceneLoop
              html={scenes.hero}
              label="Illustration : le code s'écrit, les tests passent, +50 XP, le niveau monte et le module suivant s'ouvre."
            />
          </motion.div>

          {stats.length > 0 && (
            <motion.dl {...rise(0.5)} className="flex flex-wrap gap-x-10 gap-y-6 lg:col-start-1 lg:row-start-1 lg:flex-col lg:pb-6">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col-reverse border-l-2 border-(--brand-lime) pl-4">
                  <dt className="mt-1.5 text-sm text-muted">{s.label}</dt>
                  <dd className="flex items-start gap-1 font-display text-6xl leading-none font-extrabold">
                    <CountUp value={s.value} />
                    <Spark className="mt-1 size-4 text-(--brand-lime)" />
                  </dd>
                </div>
              ))}
            </motion.dl>
          )}

          <motion.div {...rise(0.65)} className="lg:col-start-3 lg:row-start-1 lg:pb-6">
            <p className="text-lg leading-relaxed text-muted">
              Des cours tirés de livres de référence. Tu lis une leçon, tu codes dans l'éditeur, les tests valident, puis le
              module suivant s'ouvre.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Pill to={target}>{ctaLabel}</Pill>
              <a
                href="#methode"
                className="group/play flex items-center gap-3 text-sm font-semibold text-white"
                aria-label="Voir la méthode"
              >
                <span className="relative grid size-12 place-items-center rounded-full bg-white text-(--brand-blue) transition-transform duration-(--dur-base) group-hover/play:scale-110">
                  <span className="absolute inset-0 animate-ping rounded-full bg-white/40 motion-reduce:hidden" aria-hidden="true" />
                  <Play className="relative size-4 fill-current" aria-hidden="true" />
                </span>
                La méthode
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// --- Sections ------------------------------------------------------------------

function SectionHead({ eyebrow, title, aside, action }: { eyebrow: string; title: string; aside?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <Eyebrow className="text-muted">{eyebrow}</Eyebrow>
        <RevealWords text={title} className={cn(sectionTitle, 'max-w-[16ch]')} />
      </div>
      {aside && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          className="max-w-[38ch] text-muted"
        >
          {aside}
        </motion.p>
      )}
      {action}
    </div>
  )
}

const STEPS: { n: string; title: string; text: string; reward: string; scene: string; label: string; highlight?: boolean }[] = [
  {
    n: '01',
    title: 'Lire la leçon',
    text: 'Une leçon courte, reformulée depuis le livre. Chacune cite son chapitre et ses pages.',
    reward: '+30 XP',
    scene: scenes.lire,
    label: 'Illustration : un livre s’ouvre, une phrase est surlignée, la source est citée.',
  },
  {
    n: '02',
    title: 'Coder pour de vrai',
    text: 'L’exercice s’écrit dans l’éditeur et s’exécute dans un conteneur isolé. Des indices si tu bloques.',
    reward: 'indices au besoin',
    scene: scenes.coder,
    label: 'Illustration : un programme s’écrit, on clique sur Lancer, il affiche « Bonjour, Go ! ».',
    highlight: true,
  },
  {
    n: '03',
    title: 'Valider, puis avancer',
    text: 'Les tests valident ton code ; l’architecture se corrige avec une grille. À 80 % de maîtrise, la suite s’ouvre.',
    reward: '+50 XP',
    scene: scenes.valider,
    label: 'Illustration : quatre tests passent, l’anneau atteint 100 %, le module suivant s’ouvre.',
  },
]

function MethodSection() {
  return (
    <section id="methode" className="scroll-mt-8">
      <div className="mx-auto max-w-[1320px] px-6 py-28">
        <SectionHead
          eyebrow="La méthode"
          title="Lire, coder, valider. Puis la suite."
          action={
            <Pill href="#cours" variant="outline">
              Tous les cours
            </Pill>
          }
        />
        <motion.ol
          className="mt-16 grid gap-5 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ staggerChildren: 0.12 }}
        >
          {STEPS.map((step) => (
            <StepCard key={step.n} {...step} />
          ))}
        </motion.ol>
      </div>
    </section>
  )
}

const cardIn = {
  hidden: { opacity: 0, y: 60 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
}

function StepCard({ n, title, text, reward, scene, label, highlight }: (typeof STEPS)[number]) {
  const art = (
    <SceneLoop html={scene} label={label} className={cn('rounded-2xl', highlight ? 'bg-(--brand-blue-deep)' : 'bg-[#1d1f2b]')} />
  )
  return (
    <motion.li
      variants={cardIn}
      whileHover={{ y: -8 }}
      className={cn(
        'group flex flex-col gap-6 rounded-[1.75rem] border p-6',
        highlight ? 'lp-blue border-transparent shadow-[0_40px_80px_-40px_var(--brand-blue)] md:-mt-8 md:mb-8' : 'border-line bg-surface',
      )}
    >
      {highlight && art}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-code text-xs text-muted">{n}</p>
          <h3 className={cn('mt-2 text-[2.2rem]', display)}>{title}</h3>
        </div>
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition-transform duration-(--dur-base) group-hover:rotate-45"
          aria-hidden="true"
        >
          <ArrowUpRight className="size-5" />
        </span>
      </div>
      <p className="leading-relaxed text-muted">{text}</p>
      <p className="font-code text-xs text-accent">{reward}</p>
      {!highlight && <div className="mt-auto">{art}</div>}
    </motion.li>
  )
}

// Exemple fixe : la maîtrise d'un module est la moyenne des TP réussis et des quiz justes du premier coup.
const MASTERY = [
  { label: 'TP réussis', done: 4, total: 5 },
  { label: 'Quiz justes du premier coup', done: 13, total: 16 },
]
const THRESHOLD = 0.8

const KINDS: { icon: LucideIcon; label: string }[] = [
  { icon: BookOpen, label: 'Leçons sourcées' },
  { icon: FlaskConical, label: 'TP testés' },
  { icon: ListChecks, label: 'Quiz' },
  { icon: Layers, label: 'Flashcards' },
  { icon: TerminalSquare, label: 'Projet fil rouge' },
  { icon: Swords, label: 'Boss de module' },
  { icon: Trophy, label: 'Badges' },
]

function WhySection() {
  const score = MASTERY.reduce((s, m) => s + m.done / m.total, 0) / MASTERY.length

  return (
    <section className="lp-paper">
      <div className="mx-auto max-w-[1320px] px-6 py-28">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center">
          <div>
            <Eyebrow className="text-muted">Pourquoi ici</Eyebrow>
            <RevealWords text="La rigueur des livres. Le rythme d’un jeu." className={cn(sectionTitle, 'max-w-[15ch]')} />
            <p className="mt-8 max-w-[52ch] text-lg leading-relaxed text-muted">
              Les cours suivent des livres qui font référence, chapitre par chapitre. Chaque exercice est vérifié : la
              solution passe les tests et le code de départ les échoue.
            </p>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2">
              <Feature icon={Quote} tone="lime" title="Chaque leçon cite sa source" text="Chapitre et pages, pour aller lire l’original." />
              <Feature icon={FlaskConical} tone="blue" title="Tes tests tournent pour de vrai" text="Dans un conteneur isolé, sans réseau." />
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 50, rotate: 2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="rounded-[1.75rem] bg-surface p-8 shadow-[0_40px_80px_-50px_rgb(12_13_18/0.5)]"
          >
            <p className="text-sm text-muted">Exemple : un module de Java</p>
            <p className={cn('mt-2 text-5xl', display)}>Maîtrise du module</p>
            <div className="mt-8 grid gap-6">
              {MASTERY.map((m, i) => (
                <Bar key={m.label} label={m.label} value={m.done / m.total} detail={`${m.done}/${m.total}`} delay={0.2 + i * 0.15} />
              ))}
              <Bar label="Score" value={score} detail={`${Math.round(score * 100)} %`} delay={0.5} strong />
            </div>
            <p className="mt-6 text-sm text-muted">
              Seuil de maîtrise : {Math.round(THRESHOLD * 100)} %.{' '}
              {score >= THRESHOLD ? 'Le module suivant s’ouvre.' : 'Encore un effort pour ouvrir la suite.'}
            </p>
          </motion.div>
        </div>

        <motion.ul
          className="lp-ink mt-16 flex flex-wrap items-center justify-around gap-x-10 gap-y-6 rounded-[1.75rem] px-8 py-7"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          transition={{ staggerChildren: 0.06 }}
          aria-label="Ce que contient un module"
        >
          {KINDS.map(({ icon: Icon, label }) => (
            <motion.li
              key={label}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex items-center gap-3 text-sm font-medium"
            >
              <Icon className="size-6 text-accent" strokeWidth={1.75} aria-hidden="true" />
              {label}
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}

function Feature({ icon: Icon, tone, title, text }: { icon: LucideIcon; tone: 'lime' | 'blue'; title: string; text: string }) {
  return (
    <li className="flex gap-4">
      <span
        className={cn(
          'grid size-12 shrink-0 place-items-center rounded-full',
          tone === 'lime' ? 'bg-(--brand-lime) text-(--brand-on-lime)' : 'bg-(--brand-blue) text-white',
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
    </li>
  )
}

function Bar({ label, value, detail, delay, strong }: { label: string; value: number; detail: string; delay: number; strong?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className={cn(strong && 'font-semibold')}>{label}</span>
        <span className="font-code text-xs text-muted tabular-nums">{detail}</span>
      </div>
      <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-cell-empty">
        <motion.span
          className={cn('absolute inset-y-0 left-0 origin-left rounded-full', strong ? 'bg-(--brand-blue)' : 'bg-(--brand-on-lime)')}
          style={{ width: `${value * 100}%` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay, ease: EASE }}
        />
        {strong && <span className="absolute inset-y-0 w-0.5 bg-(--brand-lime)" style={{ left: `${THRESHOLD * 100}%` }} aria-hidden="true" />}
      </div>
    </div>
  )
}

function CoursesSection({ courses, signedIn }: { courses: CatalogCourse[]; signedIn: boolean }) {
  return (
    <section id="cours" className="scroll-mt-8">
      <div className="mx-auto max-w-[1320px] px-6 py-28">
        <SectionHead
          eyebrow="Les cours"
          title="Des livres de référence, devenus des cours"
          aside="Chaque cours suit un livre de référence, avec ses exercices testés et son projet fil rouge."
        />
        <motion.ol
          className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {courses.map((course, i) => (
            <CourseCard key={course.id} course={course} first={i === 0} signedIn={signedIn} />
          ))}
        </motion.ol>
      </div>
    </section>
  )
}

const at = (s: number) => ({ '--d': `${s.toFixed(2)}s` }) as CSSProperties

/** Carte d'un cours. Le premier, par lequel commencer, est en couleur pleine. */
function CourseCard({ course, first, signedIn }: { course: CatalogCourse; first: boolean; signedIn: boolean }) {
  const { total, written } = countModules(course)
  const reveal = useReveal<HTMLDivElement>(0.3)
  const chapters = course.tracks.flatMap((t) => t.chapters)

  return (
    <motion.li
      variants={cardIn}
      whileHover={{ y: -8 }}
      className={cn(
        'group relative flex flex-col rounded-[1.75rem] border p-7',
        first ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-[2.2rem] leading-[0.95] font-extrabold uppercase">{course.title}</h3>
        <Link
          to={signedIn ? '/courses/$courseId' : '/login'}
          params={{ courseId: course.id }}
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-full transition-transform duration-(--dur-base) group-hover:rotate-45',
            first ? 'bg-accent-ink text-accent' : 'bg-accent text-accent-ink',
          )}
          aria-label={`Ouvrir le cours ${course.title}`}
        >
          <ArrowUpRight className="size-5" aria-hidden="true" />
        </Link>
      </div>
      <p className={cn('mt-2 text-sm', first ? 'text-accent-ink/75' : 'text-muted')}>
        <CourseBooks course={course} />
      </p>
      {first && (
        <p className="mt-5 flex items-center gap-2 text-sm font-semibold">
          <ArrowRight className="size-4" aria-hidden="true" />
          Commence ici
        </p>
      )}
      <p className="mt-5 flex-1 leading-relaxed">{course.summary}</p>
      {course.requires.map((req) => (
        <RequirementNote key={req.course_id} requirement={req} className="mt-4" />
      ))}

      <div
        {...reveal}
        className={cn(
          'mt-7 flex flex-wrap gap-[3px]',
          first && '[--cell-off:color-mix(in_oklab,var(--accent-ink)_18%,transparent)] [--cell-on:var(--accent-ink)]',
        )}
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
            className={cn(
              'size-3 rounded-[2px]',
              ch.available ? 'reveal-cell bg-(--cell-on,var(--accent))' : 'bg-(--cell-off,var(--cell-empty))',
            )}
            style={at(0.1 + i * 0.05)}
          />
        ))}
      </div>
      <p className={cn('mt-3 text-sm', first ? 'text-accent-ink/75' : 'text-muted')}>
        {plural(total, 'module', 'modules')}, {written === 0 ? 'rédaction en cours' : plural(written, 'déjà prêt', 'déjà prêts')}
      </p>
    </motion.li>
  )
}

function FinalCta({ signedIn, target, ctaLabel }: { signedIn: boolean; target: string; ctaLabel: string }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const spin = useTransform(scrollYProgress, [0, 1], [-90, 90])
  const drift = useTransform(scrollYProgress, [0, 1], ['6%', '-6%'])

  return (
    <section ref={ref} className="lp-lime relative overflow-hidden">
      <motion.div style={{ rotate: spin }} className="pointer-events-none absolute -top-24 -right-24 text-(--brand-on-lime)/10" aria-hidden="true">
        <Spark className="size-[26rem]" />
      </motion.div>
      <div className="relative mx-auto grid max-w-[1320px] gap-10 px-6 py-28 lg:grid-cols-[1fr_auto] lg:items-end">
        <motion.div style={{ x: drift }}>
          <RevealWords
            text={signedIn ? 'Ton prochain module t’attend' : 'Lis, code, passe les tests'}
            className={cn('max-w-[13ch] text-[clamp(3.4rem,9vw,8.5rem)]', display)}
          />
        </motion.div>
        <div className="max-w-[34ch]">
          <p className="text-muted">
            {signedIn ? 'Ta progression reste là où tu l’as laissée.' : 'L’inscription se fait sur invitation, et chacun garde sa propre progression.'}
          </p>
          <div className="mt-6">
            <Pill to={target}>{ctaLabel}</Pill>
          </div>
        </div>
      </div>
    </section>
  )
}

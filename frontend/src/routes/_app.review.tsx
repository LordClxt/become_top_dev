import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, Brain, CalendarClock, Check, Layers, RotateCcw, Sparkles, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { GridZone } from '@/components/Backdrop'
import { ErrorState, Loading } from '@/components/states'
import { Button } from '@/components/ui/button'
import { ContinueLink } from '@/features/review/ContinueLink'
import { dueInWords, reviewQuery, todayQuery } from '@/features/review/queries'
import { play } from '@/features/juice/sound'
import { announceXp } from '@/features/xp/xp-events'
import { api, type ReviewCard, type ReviewDeck, type ReviewRating } from '@/lib/api'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/review')({
  head: () => ({ meta: [{ title: 'Révision du jour · become_top_dev' }] }),
  component: ReviewPage,
})

/** Temps moyen par carte, pour l'estimation affichée avant de commencer. */
const SECONDS_PER_CARD = 20

type Outcome = { rating: ReviewRating; box: number; dueOn: string; xp: number }

function ReviewPage() {
  // Le paquet est figé au démarrage : les invalidations pendant la séance ne doivent pas le remplacer.
  const { data, error, isPending } = useQuery({ ...reviewQuery, refetchOnWindowFocus: false })
  const [deck, setDeck] = useState<ReviewDeck | null>(null)

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} />

  return (
    <main className="relative isolate min-h-[calc(100dvh-4rem)] overflow-x-clip">
      <GridZone style={{ top: -180, left: '50%', marginLeft: -340 }} size={680} glow={{ x: 0, y: 0.1 }} />
      <div className="mx-auto max-w-[720px] px-4 pt-10 pb-24 sm:px-6 sm:pt-16">
        {deck ? (
          <Session deck={deck} onRestart={() => setDeck(null)} />
        ) : data.cards.length === 0 ? (
          <Empty deck={data} />
        ) : (
          <Intro deck={data} onStart={() => setDeck(data)} />
        )}
      </div>
    </main>
  )
}

function Eyebrow() {
  return (
    <p className="flex items-center gap-2 text-sm text-muted">
      <Brain className="size-4 text-accent" />
      Révision du jour
    </p>
  )
}

function Intro({ deck, onStart }: { deck: ReviewDeck; onStart: () => void }) {
  const total = deck.cards.length
  const due = deck.cards.filter((c) => !c.is_new).length
  const fresh = total - due
  const minutes = Math.max(1, Math.round((total * SECONDS_PER_CARD) / 60))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isTyping(e)) {
        e.preventDefault()
        onStart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart])

  return (
    <section className="review-rise">
      <Eyebrow />
      <h1 className="mt-3 font-read text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
        {total} carte{total > 1 ? 's' : ''} t’attend{total > 1 ? 'ent' : ''}
      </h1>
      <p className="mt-3 max-w-[52ch] text-muted">
        Quelques minutes de rappel actif valent mieux qu’une relecture : chaque carte sue s’éloigne dans le temps, chaque
        carte ratée revient vite.
      </p>

      <dl className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
        <IntroStat icon={RotateCcw} label="à revoir" value={due} />
        <IntroStat icon={Sparkles} label={fresh > 1 ? 'nouvelles' : 'nouvelle'} value={fresh} />
        <IntroStat icon={CalendarClock} label="environ" value={`${minutes} min`} />
      </dl>

      <div className="mt-8 flex flex-wrap gap-[3px]" aria-hidden="true">
        {deck.cards.map((c, i) => (
          <span
            key={c.id}
            className={cn('juice-cell-in size-3.5 rounded-[3px]', c.is_new ? 'border border-accent/60' : 'bg-cell-empty')}
            style={{ animationDelay: `${i * 25}ms` }}
          />
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Button className="h-12 px-6 text-base" onClick={onStart} autoFocus>
          Commencer
          <ArrowRight />
          <Kbd>Entrée</Kbd>
        </Button>
        <p className="text-sm text-muted">
          <Kbd>Espace</Kbd> retourne, <Kbd>1</Kbd> à revoir, <Kbd>2</Kbd> je savais
        </p>
      </div>
    </section>
  )
}

function IntroStat({ icon: Icon, label, value }: { icon: typeof Brain; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/80 px-4 py-4 backdrop-blur">
      <Icon className="size-4 text-muted" />
      <dd className="mt-2 font-read text-3xl font-semibold tabular-nums">{value}</dd>
      <dt className="text-sm text-muted">{label}</dt>
    </div>
  )
}

function Empty({ deck }: { deck: ReviewDeck }) {
  const { data: today } = useQuery(todayQuery)
  return (
    <section className="review-rise flex flex-col items-center pt-8 text-center">
      <span className="relative grid size-20 place-items-center rounded-3xl border-2 border-accent/60 bg-accent/10 text-accent">
        <Check className="size-9" />
        <span className="glow-accent pointer-events-none absolute -inset-10 -z-10 rounded-full" aria-hidden="true" />
      </span>
      <Eyebrow />
      <h1 className="mt-3 font-read text-4xl font-semibold tracking-tight">Tout est à jour</h1>
      <p className="mt-3 max-w-[46ch] text-muted">
        {deck.tracked > 0
          ? `Tes ${deck.tracked} carte${deck.tracked > 1 ? 's' : ''} dor${deck.tracked > 1 ? 'ment' : 't'} tranquillement. Prochaine révision ${dueInWords(deck.next_due_on)}.`
          : 'Aucune carte pour l’instant. Termine une leçon : ses flashcards arrivent ici.'}
      </p>
      {deck.tracked > 0 && (
        <p className="mt-2 text-sm text-muted">Termine une nouvelle leçon pour débloquer de nouvelles cartes.</p>
      )}
      <ContinueLink
        target={today?.continue}
        className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {today?.continue ? `${today.continue.label} : ${today.continue.title}` : 'Reprendre le cours'}
        <ArrowRight className="size-4" />
      </ContinueLink>
    </section>
  )
}

function Session({ deck, onRestart }: { deck: ReviewDeck; onRestart: () => void }) {
  const qc = useQueryClient()
  const reduceMotion = useReducedMotion()
  const byId = new Map(deck.cards.map((c) => [c.id, c]))
  // File de la séance : les cartes « à revoir » sont remises une fois en fin de file.
  const [queue, setQueue] = useState(() => deck.cards.map((c) => c.id))
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
  const [last, setLast] = useState<{ card: ReviewCard; outcome: Outcome } | null>(null)
  const [requeued, setRequeued] = useState<Set<string>>(() => new Set())
  const [xp, setXp] = useState(0)
  const [dir, setDir] = useState(1)

  const card = byId.get(queue[pos] ?? '')
  const done = pos >= queue.length

  const flip = () => {
    play('flip')
    setFlipped((f) => !f)
  }

  const rate = (rating: ReviewRating) => {
    if (!card || !flipped) return
    const current = card
    play(rating === 'known' ? 'correct' : 'flip')
    setDir(rating === 'known' ? 1 : -1)
    setFlipped(false)
    if (rating === 'review' && !requeued.has(current.id)) {
      setQueue((q) => [...q, current.id])
      setRequeued((s) => new Set(s).add(current.id))
    }
    setPos((p) => p + 1)
    api
      .rateCard(current.id, rating)
      .then((r) => {
        const outcome = { rating, box: r.box, dueOn: r.due_on, xp: r.xp_awarded }
        setOutcomes((o) => ({ ...o, [current.id]: outcome }))
        setLast({ card: current, outcome })
        if (r.xp_awarded > 0) {
          setXp((x) => x + r.xp_awarded)
          announceXp({ amount: r.xp_awarded, reason: 'Carte révisée', kind: 'review' })
        }
      })
      .catch(() => {
        const outcome = { rating, box: current.box, dueOn: '', xp: 0 }
        setOutcomes((o) => ({ ...o, [current.id]: outcome }))
        setLast({ card: current, outcome })
      })
  }

  // À la fin, le tableau de bord et le compteur de cartes doivent refléter la séance.
  useEffect(() => {
    if (!done) return
    play('complete')
    qc.invalidateQueries({ queryKey: ['today'] })
    qc.invalidateQueries({ queryKey: ['review'] })
    qc.invalidateQueries({ queryKey: ['progress'] })
    qc.invalidateQueries({ queryKey: ['leaderboard'] })
  }, [done, qc])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ' || e.key === 'Enter') flip()
      else if (e.key === '1') rate('review')
      else if (e.key === '2') rate('known')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (done) return <Done deck={deck} outcomes={outcomes} missed={requeued} xp={xp} onRestart={onRestart} />
  if (!card) return null

  const remaining = queue.length - pos
  const shownBox = outcomes[card.id]?.box ?? card.box

  return (
    <section aria-labelledby="review-title">
      <div className="flex items-center justify-between gap-4">
        <h1 id="review-title" className="sr-only">
          Révision du jour
        </h1>
        <Eyebrow />
        <Link to="/learn" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text" aria-label="Quitter la révision">
          <X className="size-4" /> Quitter
        </Link>
      </div>

      <SessionCells queue={queue} pos={pos} outcomes={outcomes} requeued={requeued} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link
          to="/lessons/$lessonId"
          params={{ lessonId: card.lesson_id }}
          className="inline-flex min-w-0 items-center gap-2 text-muted hover:text-accent"
        >
          <BookOpen className="size-4 shrink-0" />
          <span className="truncate">
            {card.course_title} · {card.lesson_title}
          </span>
        </Link>
        <LeitnerBox box={shownBox} isNew={card.is_new && !outcomes[card.id]} />
      </div>

      <div className="relative mt-4 pb-4">
        {remaining > 2 && <DeckLayer depth={2} />}
        {remaining > 1 && <DeckLayer depth={1} />}
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={`${pos}-${card.id}`}
            custom={dir}
            variants={{
              enter: { opacity: 0, y: 14, scale: 0.97 },
              center: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 },
              exit: (d: number) => ({ opacity: 0, x: d * 110, rotate: d * 4 }),
            }}
            initial={reduceMotion ? false : 'enter'}
            animate="center"
            exit={reduceMotion ? { opacity: 0 } : 'exit'}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flip-scene relative"
          >
            <button
              type="button"
              onClick={flip}
              aria-pressed={flipped}
              aria-label={flipped ? `Réponse : ${card.back}` : `Question : ${card.front}. Retourner pour voir la réponse`}
              className="group block w-full rounded-2xl text-left"
            >
              <span className="flip-card" data-flipped={flipped}>
                <Face side="front" hidden={flipped}>
                  <span className="flex items-center justify-between text-sm text-muted">
                    <span>Question</span>
                    {card.concept && <span className="font-code text-xs">{card.concept}</span>}
                  </span>
                  <span className="my-auto block py-10 text-center font-read text-2xl leading-snug font-semibold text-balance sm:text-3xl">
                    {card.front}
                  </span>
                  <span className="text-center text-sm text-muted group-hover:text-text">
                    Réponds dans ta tête, puis <Kbd>Espace</Kbd>
                  </span>
                </Face>
                <Face side="back" hidden={!flipped}>
                  <span className="text-sm text-accent">Réponse</span>
                  <span className="my-auto block py-10 text-center font-read text-xl leading-relaxed text-pretty sm:text-2xl">
                    {card.back}
                  </span>
                  <span className="text-center text-sm text-muted">Sois honnête : c’est ton futur toi qui en profite.</span>
                </Face>
              </span>
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-2 flex min-h-12 items-center justify-center gap-3">
        {flipped ? (
          <>
            <Button
              variant="outline"
              className="h-12 flex-1 border-fail/60 px-5 text-fail hover:bg-fail/10 hover:text-fail sm:flex-none"
              onClick={() => rate('review')}
            >
              <RotateCcw /> À revoir <Kbd>1</Kbd>
            </Button>
            <Button className="h-12 flex-1 px-5 sm:flex-none" onClick={() => rate('known')}>
              <Check /> Je savais <Kbd>2</Kbd>
            </Button>
          </>
        ) : (
          <Button variant="outline" className="h-12 px-6" onClick={flip}>
            Retourner la carte <Kbd>Espace</Kbd>
          </Button>
        )}
      </div>

      <p className="mt-5 min-h-5 text-center text-sm text-muted" aria-live="polite">
        {last && (
          <span key={last.card.id + last.outcome.rating} className="review-rise inline-flex items-center gap-2">
            <span className={cn('size-2 rounded-full', last.outcome.rating === 'known' ? 'bg-accent' : 'bg-fail')} />
            Carte précédente : {last.outcome.dueOn ? `reviendra ${dueInWords(last.outcome.dueOn)}` : 'note non enregistrée'}
            {last.outcome.xp > 0 && <span className="font-code text-accent">+{last.outcome.xp} XP</span>}
          </span>
        )}
      </p>
    </section>
  )
}

/** Une case par passage de carte : accent si sue, ambre si à revoir, contour pour la carte en cours. */
function SessionCells({
  queue,
  pos,
  outcomes,
  requeued,
}: {
  queue: string[]
  pos: number
  outcomes: Record<string, Outcome>
  requeued: Set<string>
}) {
  // Une carte remise en file apparaît deux fois : le premier passage est « à revoir », le second porte la note finale.
  const seen = new Map<string, number>()
  return (
    <div className="mt-6 flex items-center gap-3">
      <div className="flex flex-1 flex-wrap gap-[3px]" role="img" aria-label={`Carte ${Math.min(pos + 1, queue.length)} sur ${queue.length}`}>
        {queue.map((id, i) => {
          const n = (seen.get(id) ?? 0) + 1
          seen.set(id, n)
          const firstOfTwo = requeued.has(id) && n === 1
          const state = i >= pos ? 'todo' : firstOfTwo ? 'review' : (outcomes[id]?.rating ?? 'pending')
          return (
            <span
              key={`${id}-${n}`}
              className={cn(
                'h-2 min-w-2 flex-1 rounded-[2px] transition-colors duration-(--dur-base)',
                state === 'known' ? 'bg-accent' : state === 'review' ? 'bg-fail' : state === 'pending' ? 'bg-muted/50' : 'bg-cell-empty',
                i === pos && 'ring-1 ring-text ring-offset-1 ring-offset-ink',
              )}
            />
          )
        })}
      </div>
      <span className="font-code text-xs text-muted tabular-nums">
        {pos}/{queue.length}
      </span>
    </div>
  )
}

/** Les 5 boîtes de Leitner : plus la carte est haute, plus elle revient tard. */
function LeitnerBox({ box, isNew }: { box: number; isNew: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" title="Boîte de Leitner : chaque bonne réponse fait monter la carte">
      {isNew ? (
        <span className="rounded-full border border-accent/60 px-2 py-0.5 text-xs text-accent">Nouvelle</span>
      ) : (
        <span className="text-xs text-muted">Boîte {box}/5</span>
      )}
      <span className="flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((b) => (
          <span
            key={b}
            className={cn('size-3 rounded-[2px] transition-colors duration-(--dur-base)', b <= box ? 'bg-accent' : 'bg-cell-empty')}
          />
        ))}
      </span>
    </span>
  )
}

function Done({
  deck,
  outcomes,
  missed,
  xp,
  onRestart,
}: {
  deck: ReviewDeck
  outcomes: Record<string, Outcome>
  /** Cartes ratées au premier passage : elles comptent « à revoir » même si le second passage est bon. */
  missed: Set<string>
  xp: number
  onRestart: () => void
}) {
  const { data: today } = useQuery(todayQuery)
  const { data: fresh } = useQuery(reviewQuery)
  const list = Object.values(outcomes)
  const again = deck.cards.filter((c) => missed.has(c.id) || outcomes[c.id]?.rating === 'review').length
  const known = deck.cards.length - again
  const perfect = again === 0
  // Les dates de retour de la séance donnent la prochaine échéance, faute de mieux.
  const nextDue = fresh?.cards.length ? null : (fresh?.next_due_on ?? list.map((o) => o.dueOn).filter(Boolean).sort()[0])

  return (
    <section className="review-rise">
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'juice-pop relative grid size-16 place-items-center rounded-2xl border-2',
            perfect ? 'border-accent bg-accent/10 text-accent' : 'border-line text-text',
          )}
        >
          <Layers className="size-7" />
          {perfect && <span className="glow-accent pointer-events-none absolute -inset-10 -z-10 rounded-full" aria-hidden="true" />}
        </span>
        <div>
          <Eyebrow />
          <h1 className="font-read text-4xl font-semibold tracking-tight">{perfect ? 'Sans faute' : 'Révision terminée'}</h1>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-[3px]" aria-hidden="true">
        {deck.cards.map((c, i) => (
          <span
            key={c.id}
            className={cn('juice-cell-in size-4 rounded-[3px]', !missed.has(c.id) && outcomes[c.id]?.rating === 'known' ? 'bg-accent' : 'bg-fail')}
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
        <IntroStat icon={Check} label={known > 1 ? 'sues' : 'sue'} value={known} />
        <IntroStat icon={RotateCcw} label="à revoir" value={again} />
        <IntroStat icon={Sparkles} label="XP gagnés" value={`+${xp}`} />
      </dl>

      <p className="mt-6 text-muted">
        {fresh?.cards.length
          ? `Encore ${fresh.cards.length} carte${fresh.cards.length > 1 ? 's' : ''} disponible${fresh.cards.length > 1 ? 's' : ''} aujourd’hui.`
          : `Prochaines cartes ${dueInWords(nextDue)}.`}{' '}
        {again > 0 && 'Les cartes ratées reviennent vite : c’est voulu.'}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <ContinueLink
          target={today?.continue}
          className="inline-flex h-11 max-w-full items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <span className="truncate">{today?.continue ? `${today.continue.label} : ${today.continue.title}` : 'Continuer à apprendre'}</span>
          <ArrowRight className="size-4 shrink-0" />
        </ContinueLink>
        {!!fresh?.cards.length && (
          <Button variant="outline" className="h-11" onClick={onRestart}>
            <RotateCcw /> Nouvelle série
          </Button>
        )}
      </div>
    </section>
  )
}

function Face({ side, hidden, children }: { side: 'front' | 'back'; hidden: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-hidden={hidden}
      className={cn(
        'flip-face relative isolate flex min-h-72 flex-col overflow-hidden rounded-2xl border bg-surface p-6 md:p-8',
        'transition-colors duration-(--dur-fast)',
        side === 'front' ? 'flip-face-front border-line group-hover:border-accent/70' : 'flip-face-back border-accent',
      )}
    >
      {side === 'back' && (
        <span className="glow-accent pointer-events-none absolute -top-24 left-1/2 -z-10 size-56 -translate-x-1/2 rounded-full" aria-hidden="true" />
      )}
      {children}
    </span>
  )
}

function DeckLayer({ depth }: { depth: 1 | 2 }) {
  return (
    <div
      className="absolute inset-x-0 top-0 bottom-4 rounded-2xl border border-line bg-surface"
      style={{ transform: `translateY(${depth * 8}px) scale(${1 - depth * 0.03})`, opacity: 1 - depth * 0.35 }}
      aria-hidden="true"
    />
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="ml-1 rounded border border-current/30 px-1.5 font-code text-[11px] leading-4 opacity-70">{children}</kbd>
  )
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

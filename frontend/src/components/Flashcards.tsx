import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type KeyboardEvent, type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Lesson } from '@/lib/api'
import { cn } from '@/lib/utils'

type Card = Lesson['flashcards'][number]
type Rating = 'known' | 'review'

/**
 * Paquet de flashcards : on retourne la carte, on se note honnêtement, les cartes ratées reviennent au tour suivant.
 * Les notes restent dans la session (rien n'est envoyé au serveur).
 */
export function Flashcards({ cards }: { cards: Card[] }) {
  const reduceMotion = useReducedMotion()
  const [queue, setQueue] = useState(() => cards.map((c) => c.id))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [ratings, setRatings] = useState<Record<string, Rating>>({})
  const [round, setRound] = useState(1)
  // Sens de sortie de la carte : à droite si sue, à gauche sinon.
  const [exitDir, setExitDir] = useState(1)

  const byId = new Map(cards.map((c) => [c.id, c]))
  const card = byId.get(queue[index] ?? '')
  const finished = queue.every((id) => ratings[id])
  const known = queue.filter((id) => ratings[id] === 'known').length
  const review = queue.filter((id) => ratings[id] === 'review')

  const go = (delta: number) => {
    setExitDir(delta)
    setFlipped(false)
    setIndex((i) => (i + delta + queue.length) % queue.length)
  }

  const rate = (rating: Rating) => {
    if (!card) return
    const next = { ...ratings, [card.id]: rating }
    setRatings(next)
    setExitDir(rating === 'known' ? 1 : -1)
    setFlipped(false)
    // Prochaine carte pas encore notée, dans l'ordre du paquet.
    const after = queue.findIndex((id, i) => i > index && !next[id])
    const before = queue.findIndex((id) => !next[id])
    setIndex(after !== -1 ? after : before !== -1 ? before : index)
  }

  const restart = (ids: string[]) => {
    setQueue(ids)
    setIndex(0)
    setFlipped(false)
    setRatings({})
    setRound((r) => r + 1)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (finished) return
    if (e.key === 'ArrowRight') go(1)
    else if (e.key === 'ArrowLeft') go(-1)
    else if (flipped && e.key === '1') rate('review')
    else if (flipped && e.key === '2') rate('known')
    else return
    e.preventDefault()
  }

  if (!card) return null

  return (
    // Raccourcis clavier du paquet, actifs quand le focus est dans la section.
    <section className="mt-12" aria-labelledby="cards-title" onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="cards-title" className="font-read text-2xl font-semibold">
            Flashcards
          </h2>
          <p className="mt-1 text-sm text-muted">
            {round > 1 ? `Tour ${round} : les cartes à revoir.` : 'Réponds dans ta tête, retourne la carte, puis note-toi.'}
          </p>
        </div>
        <Tally queue={queue} ratings={ratings} current={finished ? null : index} />
      </div>

      {finished ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-8">
          <p className="font-read text-2xl font-semibold">
            {review.length === 0 ? 'Paquet maîtrisé' : 'Paquet terminé'}
          </p>
          <p className="mt-2 text-muted">
            {known} carte{known > 1 ? 's' : ''} sue{known > 1 ? 's' : ''}
            {review.length > 0 && `, ${review.length} à revoir`}.
            {review.length > 0 && ' Les revoir maintenant ancre mieux que relire la leçon.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {review.length > 0 && (
              <Button onClick={() => restart(review)}>
                Revoir {review.length === 1 ? 'la carte' : `les ${review.length} cartes`}
              </Button>
            )}
            <Button variant={review.length > 0 ? 'ghost' : 'default'} onClick={() => restart(cards.map((c) => c.id))}>
              <RotateCcw /> Reprendre tout le paquet
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative mt-6 pb-4">
            {/* Les cartes restantes, en pile derrière. */}
            {queue.length - index > 2 && <DeckLayer depth={2} />}
            {queue.length - index > 1 && <DeckLayer depth={1} />}

            <AnimatePresence mode="popLayout" initial={false} custom={exitDir}>
              <motion.div
                key={`${round}-${card.id}`}
                custom={exitDir}
                variants={{
                  enter: { opacity: 0, y: 14, scale: 0.97 },
                  center: { opacity: 1, x: 0, y: 0, scale: 1 },
                  exit: (dir: number) => ({ opacity: 0, x: dir * 90, rotate: dir * 3 }),
                }}
                initial={reduceMotion ? false : 'enter'}
                animate="center"
                exit={reduceMotion ? { opacity: 0 } : 'exit'}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="flip-scene relative"
              >
                <button
                  type="button"
                  onClick={() => setFlipped(!flipped)}
                  aria-pressed={flipped}
                  aria-label={flipped ? `Réponse : ${card.back}. Retourner vers la question` : `Question : ${card.front}. Retourner pour voir la réponse`}
                  className="group block w-full rounded-2xl text-left"
                >
                  <span className="flip-card" data-flipped={flipped}>
                    <Face side="front" hidden={flipped}>
                      <span className="text-sm text-muted">Question</span>
                      <span className="my-auto block py-8 text-center font-read text-2xl leading-snug font-semibold text-balance">
                        {card.front}
                      </span>
                      <span className="text-center text-sm text-muted group-hover:text-text">
                        Clique ou appuie sur Espace pour retourner
                      </span>
                    </Face>
                    <Face side="back" hidden={!flipped}>
                      <span className="text-sm text-accent">Réponse</span>
                      <span className="my-auto block py-8 text-center font-read text-xl leading-relaxed text-pretty">
                        {card.back}
                      </span>
                      <span className="text-center text-sm text-muted">Tu la savais ?</span>
                    </Face>
                  </span>
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
            <Button variant="ghost" size="icon" onClick={() => go(-1)} aria-label="Carte précédente">
              <ChevronLeft />
            </Button>
            {flipped ? (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="h-11 border-fail/60 px-5 text-fail hover:bg-fail/10 hover:text-fail"
                  onClick={() => rate('review')}
                >
                  À revoir
                  <Kbd>1</Kbd>
                </Button>
                <Button className="h-11 px-5" onClick={() => rate('known')}>
                  Je savais
                  <Kbd>2</Kbd>
                </Button>
              </div>
            ) : (
              <span className="text-sm text-muted tabular-nums">
                Carte {index + 1} sur {queue.length}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={() => go(1)} aria-label="Carte suivante">
              <ChevronRight />
            </Button>
          </div>
        </>
      )}
    </section>
  )
}

function Face({ side, hidden, children }: { side: 'front' | 'back'; hidden: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden={hidden}
      className={cn(
        'flip-face relative isolate flex min-h-64 flex-col overflow-hidden rounded-2xl border bg-surface p-6 md:p-8',
        'transition-colors duration-(--dur-fast)',
        side === 'front' ? 'flip-face-front border-line group-hover:border-accent/70' : 'flip-face-back border-accent',
      )}
    >
      {side === 'back' && (
        <span className="glow-cyan pointer-events-none absolute -top-24 left-1/2 -z-10 size-56 -translate-x-1/2 rounded-full" aria-hidden="true" />
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

/** Une case par carte du tour : cyan si sue, ambre si à revoir, contour pour la carte affichée. */
function Tally({ queue, ratings, current }: { queue: string[]; ratings: Record<string, Rating>; current: number | null }) {
  const known = queue.filter((id) => ratings[id] === 'known').length
  const review = queue.filter((id) => ratings[id] === 'review').length
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex gap-[3px]"
        role="img"
        aria-label={`${known} sue${known > 1 ? 's' : ''}, ${review} à revoir, sur ${queue.length} cartes`}
      >
        {queue.map((id, i) => (
          <span
            key={id}
            className={cn(
              'size-3 rounded-[2px] transition-colors duration-(--dur-base)',
              ratings[id] === 'known' ? 'bg-accent' : ratings[id] === 'review' ? 'bg-fail' : 'bg-cell-empty',
              i === current && 'ring-1 ring-text ring-offset-1 ring-offset-ink',
            )}
          />
        ))}
      </div>
      <span className="font-code text-xs text-muted tabular-nums">
        {known}/{queue.length}
      </span>
    </div>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="ml-1 rounded border border-current/30 px-1.5 font-code text-[11px] leading-4 opacity-70">{children}</kbd>
  )
}

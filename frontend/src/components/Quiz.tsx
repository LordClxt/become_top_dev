import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, CornerDownLeft, RotateCcw, Sparkles, Star, X, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CodeBlock } from '@/components/CodeBlock'
import { Button } from '@/components/ui/button'
import { play } from '@/features/juice/sound'
import { announceXp } from '@/features/xp/xp-events'
import { type AnswerResult, api, type QuizQuestion } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Le quiz comme un petit jeu : une question à la fois, une rangée de cases qui se colorent,
 * des combos de bonnes réponses, et un écran de fin qui dit quoi faire ensuite.
 * Clavier : 1 à 9 choisit, Entrée valide, Entrée à nouveau continue (Ctrl/Cmd+Entrée dans la zone de texte).
 */
export function Quiz({ quizId }: { quizId: string }) {
  const { data } = useQuery({ queryKey: ['quiz', quizId], queryFn: () => api.quiz(quizId) })
  const [round, setRound] = useState<string[] | null>(null)
  const [pos, setPos] = useState(0)
  const [results, setResults] = useState<Record<string, AnswerResult>>({})
  const [combo, setCombo] = useState(0)
  const [best, setBest] = useState(0)
  const [broke, setBroke] = useState(0)
  const [done, setDone] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const active = useInView(sectionRef)

  const order = round ?? data?.questions.map((q) => q.id) ?? []
  const byId = new Map(data?.questions.map((q) => [q.id, q]) ?? [])
  const question = byId.get(order[pos] ?? '')

  const comboRef = useRef(0)
  const onResult = useCallback((id: string, r: AnswerResult) => {
    setResults((prev) => ({ ...prev, [id]: r }))
    if (r.correct) {
      const next = comboRef.current + 1
      comboRef.current = next
      setCombo(next)
      setBest((b) => Math.max(b, next))
      play(next >= 2 ? 'combo' : 'correct', { combo: next })
    } else {
      if (comboRef.current >= 2) setBroke((n) => n + 1)
      comboRef.current = 0
      setCombo(0)
      play('wrong')
    }
  }, [])

  const next = useCallback(() => {
    if (pos + 1 < order.length) setPos(pos + 1)
    else {
      setDone(true)
      play('complete')
    }
  }, [pos, order.length])

  if (!data || data.questions.length === 0) return null

  const replay = (ids: string[]) => {
    setResults((prev) => {
      const copy = { ...prev }
      for (const id of ids) delete copy[id]
      return copy
    })
    setRound(ids)
    setPos(0)
    comboRef.current = 0
    setCombo(0)
    setDone(false)
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section
      id="quiz"
      ref={sectionRef}
      className="mt-12 scroll-mt-20 rounded-2xl border border-line bg-surface/60 p-5 md:p-8"
      aria-labelledby="quiz-title"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 id="quiz-title" className="font-read text-2xl font-semibold">
          {round ? 'Revoir mes erreurs' : 'Vérifie ta compréhension'}
        </h2>
        <div className="flex items-center gap-3">
          <ComboBadge combo={combo} broke={broke} />
          <RoundCells order={order} pos={done ? -1 : pos} results={results} />
        </div>
      </div>

      {done ? (
        <EndScreen
          lessonId={data.lesson_id}
          order={order}
          results={results}
          best={best}
          replaying={round !== null}
          onReplay={replay}
        />
      ) : (
        question && (
          <QuestionCard
            key={`${question.id}-${round ? 'r' : 'a'}`}
            quizId={quizId}
            question={question}
            language={data.language}
            result={results[question.id]}
            index={pos}
            total={order.length}
            keyboard={active}
            onResult={(r) => onResult(question.id, r)}
            onNext={next}
          />
        )
      )}
    </section>
  )
}

/** La rangée de cases de la manche : verte si juste, ambre si manquée, la case courante est cerclée. */
function RoundCells({ order, pos, results }: { order: string[]; pos: number; results: Record<string, AnswerResult> }) {
  const ok = order.filter((id) => results[id]?.correct).length
  return (
    <div className="flex items-center gap-2.5">
      <ol className="flex gap-[3px]" aria-label={`${ok} bonnes réponses sur ${order.length}`}>
        {order.map((id, i) => {
          const r = results[id]
          return (
            <li
              key={id}
              className={cn(
                'h-3 w-3.5 rounded-[3px] transition-colors duration-300 md:h-3.5 md:w-5',
                r ? (r.correct ? 'juice-cell-in bg-pass' : 'juice-cell-in bg-fail') : 'bg-cell-empty',
                i === pos && !r && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
              )}
            />
          )
        })}
      </ol>
      <span className="font-code text-xs text-muted tabular-nums">
        {Math.min(pos < 0 ? order.length : pos + 1, order.length)}/{order.length}
      </span>
    </div>
  )
}

function ComboBadge({ combo, broke }: { combo: number; broke: number }) {
  // Le combo s'affiche dès deux bonnes réponses d'affilée ; une erreur le fait s'effacer en douceur.
  const [fading, setFading] = useState<number | null>(null)
  const lastCombo = useRef(combo)
  useEffect(() => {
    if (combo === 0 && lastCombo.current >= 2) {
      setFading(lastCombo.current)
      const id = setTimeout(() => setFading(null), 420)
      lastCombo.current = combo
      return () => clearTimeout(id)
    }
    lastCombo.current = combo
  }, [combo, broke])

  const shown = combo >= 2 ? combo : fading
  if (!shown) return <span className="h-7 w-0" aria-hidden="true" />
  return (
    <span
      key={combo >= 2 ? `c${combo}` : `b${broke}`}
      className={cn(
        'flex h-7 items-center gap-1 rounded-full border px-2.5 font-code text-sm font-semibold tabular-nums',
        combo >= 2 ? 'juice-combo border-accent bg-accent/15 text-accent' : 'juice-combo-break border-line text-muted',
      )}
      style={combo >= 2 ? { fontSize: `${Math.min(1.05, 0.8 + combo * 0.05)}rem` } : undefined}
      aria-live="polite"
    >
      <Zap className="size-3.5" />x{shown}
      <span className="sr-only">bonnes réponses d’affilée</span>
    </span>
  )
}

function QuestionCard({
  quizId,
  question: q,
  language,
  result,
  index,
  total,
  keyboard,
  onResult,
  onNext,
}: {
  quizId: string
  language: string
  question: QuizQuestion
  result?: AnswerResult
  index: number
  total: number
  keyboard: boolean
  onResult: (r: AnswerResult) => void
  onNext: () => void
}) {
  const qc = useQueryClient()
  const [single, setSingle] = useState<number | null>(null)
  const [multiple, setMultiple] = useState<number[]>([])
  const [text, setText] = useState('')
  const continueRef = useRef<HTMLButtonElement>(null)

  const choiceBased = q.type === 'single' || q.type === 'multiple'
  const answer = q.type === 'single' ? single : q.type === 'multiple' ? multiple : text
  const ready = q.type === 'single' ? single !== null : q.type === 'multiple' ? multiple.length > 0 : text.trim() !== ''

  const submit = useMutation({
    mutationFn: () => api.answer(quizId, q.id, answer),
    onSuccess: (r) => {
      announceXp({ amount: r.xp_awarded, reason: 'Bonne réponse', kind: 'quiz' })
      onResult(r)
      qc.invalidateQueries({ queryKey: ['progress'] })
    },
  })

  const validate = useCallback(() => {
    if (!result && ready && !submit.isPending) submit.mutate()
  }, [result, ready, submit])

  const pick = useCallback(
    (i: number) => {
      if (result) return
      if (q.type === 'single') setSingle(i)
      else setMultiple((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]))
    },
    [q.type, result],
  )

  // Après validation, « Continuer » prend le focus : Entrée enchaîne naturellement.
  useEffect(() => {
    if (result) continueRef.current?.focus({ preventScroll: true })
  }, [result])

  // Raccourcis actifs seulement quand le quiz est à l'écran, et jamais pendant la frappe ailleurs.
  useEffect(() => {
    if (!keyboard) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey) return
      const t = e.target as HTMLElement | null
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if (typing) return
      if (e.metaKey || e.ctrlKey) return
      if (choiceBased && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1
        if (i < q.choices.length) {
          e.preventDefault()
          pick(i)
        }
      } else if (e.key === 'Enter') {
        // Sur un bouton focalisé, on laisse le clic natif faire le travail.
        if (t?.tagName === 'BUTTON' || t?.tagName === 'A') return
        e.preventDefault()
        if (result) onNext()
        else validate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard, choiceBased, q.choices.length, pick, result, onNext, validate])

  const expected: number[] = result
    ? Array.isArray(result.expected)
      ? (result.expected as number[])
      : [result.expected as number]
    : []

  return (
    <div className={cn('rounded-xl', result && !result.correct && 'juice-shake', result?.correct && 'juice-correct')}>
      <p className="font-code text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
        Question {index + 1} sur {total}
      </p>
      <p className="mt-2 text-lg leading-relaxed">{q.prompt}</p>
      {q.code && (
        <div className="mt-4">
          <CodeBlock code={q.code} language={language} />
        </div>
      )}
      {q.answered && !result && (
        <p className="mt-2 text-sm text-muted">Déjà répondue : tu peux réessayer, sans XP cette fois.</p>
      )}

      {choiceBased && (
        <ul className="mt-5 grid gap-2">
          {q.choices.map((choice, i) => {
            const selected = q.type === 'single' ? single === i : multiple.includes(i)
            const isExpected = !!result && expected.includes(i)
            const wrongPick = !!result && selected && !isExpected
            return (
              <li key={choice}>
                <button
                  type="button"
                  disabled={!!result}
                  aria-pressed={selected}
                  onClick={() => pick(i)}
                  className={cn(
                    'group flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-[border-color,background-color,transform] duration-(--dur-fast) active:scale-[0.99]',
                    selected ? 'border-accent bg-accent/8' : 'border-line hover:border-muted hover:bg-surface-2/50',
                    isExpected && 'border-pass bg-pass/8',
                    wrongPick && 'border-fail bg-fail/8',
                    result && !isExpected && !wrongPick && 'opacity-60',
                  )}
                >
                  <kbd
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-md border font-code text-xs tabular-nums transition-colors',
                      selected && !result ? 'border-accent bg-accent text-accent-ink' : 'border-line text-muted',
                      isExpected && 'border-pass bg-pass text-ink',
                      wrongPick && 'border-fail bg-fail text-ink',
                    )}
                    aria-hidden="true"
                  >
                    {isExpected ? <Check className="size-3.5" /> : wrongPick ? <X className="size-3.5" /> : i + 1}
                  </kbd>
                  <span className="pt-0.5">{choice}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {q.type === 'code-output' && (
        <label className="mt-5 block">
          <span className="mb-2 block text-sm text-muted">Ce que le programme affiche</span>
          <textarea
            value={text}
            disabled={!!result}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                validate()
              }
            }}
            rows={3}
            spellCheck={false}
            className="w-full rounded-md border border-line bg-surface p-3 font-code text-sm outline-none focus:border-accent"
          />
        </label>
      )}

      {result && (
        <div
          className={cn('mt-5 rounded-lg border-l-4 bg-surface p-4', result.correct ? 'border-pass' : 'border-fail')}
          role="status"
        >
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {result.correct ? <Check className="size-4 text-pass" /> : <X className="size-4 text-fail" />}
            {result.correct ? 'Bonne réponse' : 'Pas tout à fait'}
            {result.xp_awarded > 0 && <span className="font-code text-sm text-accent">+{result.xp_awarded} XP</span>}
          </p>
          {!result.correct && q.type === 'code-output' && (
            <pre className="mt-3 font-code text-sm">{String(result.expected)}</pre>
          )}
          {!result.correct && (
            <p className="mt-2 font-code text-[11px] tracking-[0.12em] text-fail uppercase">À retenir</p>
          )}
          <p className="mt-1 text-muted">{result.explanation}</p>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        {!result ? (
          <Button disabled={!ready || submit.isPending} onClick={validate}>
            Valider
            <KeyHint>{q.type === 'code-output' ? 'Ctrl Entrée' : 'Entrée'}</KeyHint>
          </Button>
        ) : (
          <Button ref={continueRef} onClick={onNext}>
            Continuer
            <KeyHint>
              <CornerDownLeft className="size-3" />
            </KeyHint>
          </Button>
        )}
        {!result && choiceBased && (
          <span className="hidden text-xs text-muted md:inline">
            Touches 1 à {Math.min(9, q.choices.length)} pour choisir
          </span>
        )}
      </div>
    </div>
  )
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 hidden items-center rounded border border-current/25 px-1 font-code text-[10px] opacity-70 md:inline-flex">
      {children}
    </span>
  )
}

function EndScreen({
  lessonId,
  order,
  results,
  best,
  replaying,
  onReplay,
}: {
  lessonId: string
  order: string[]
  results: Record<string, AnswerResult>
  best: number
  replaying: boolean
  onReplay: (ids: string[]) => void
}) {
  const answered = order.filter((id) => results[id])
  const ok = answered.filter((id) => results[id]?.correct).length
  const missed = order.filter((id) => results[id] && !results[id]?.correct)
  const xp = Object.values(results).reduce((n, r) => n + r.xp_awarded, 0)
  const bonus = Object.values(results).find((r) => r.bonus)?.bonus ?? null
  const ratio = order.length ? ok / order.length : 0
  const stars = ratio === 1 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0
  const { data: lesson } = useQuery({ queryKey: ['lesson', lessonId], queryFn: () => api.lesson(lessonId) })
  const nextLab = lesson?.labs.find((l) => !l.passed)

  return (
    <div className="grid justify-items-center gap-4 py-2 text-center" role="status">
      <div className="flex gap-2" aria-label={`${stars} étoile${stars > 1 ? 's' : ''} sur 3`}>
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            className={cn('juice-pop size-9', i < stars ? 'fill-accent text-accent' : 'text-cell-empty')}
            style={{ animationDelay: `${120 + i * 140}ms` }}
          />
        ))}
      </div>
      <h3 className="font-read text-3xl font-semibold tracking-tight">
        {ratio === 1 ? (replaying ? 'Erreurs corrigées' : 'Sans faute') : ratio >= 0.6 ? 'Bien joué' : 'Quiz terminé'}
      </h3>
      <p className="text-muted">
        <span className="font-code text-text tabular-nums">
          {ok}/{order.length}
        </span>{' '}
        bonne{ok > 1 ? 's' : ''} réponse{ok > 1 ? 's' : ''}
        {best >= 2 && (
          <>
            {' '}· meilleur combo <span className="font-code text-accent">x{best}</span>
          </>
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 font-code text-sm tabular-nums">
          <Sparkles className="size-3.5 text-accent" />+{xp} XP dans cette session
        </span>
        {bonus && (
          <span className="juice-pop flex items-center gap-1.5 rounded-full border border-accent bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
            {bonus.label} <span className="font-code">+{bonus.xp} XP</span>
          </span>
        )}
      </div>
      {xp === 0 && answered.length > 0 && (
        <p className="max-w-md text-sm text-muted">
          Ces questions étaient déjà réussies : l’XP n’est donnée qu’une fois, la révision, elle, compte toujours.
        </p>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {missed.length > 0 && (
          <Button variant="outline" onClick={() => onReplay(missed)}>
            <RotateCcw className="size-4" />
            Revoir mes erreurs ({missed.length})
          </Button>
        )}
        {nextLab ? (
          <Button asChild>
            <Link to="/exercises/$exerciseId" params={{ exerciseId: nextLab.id }}>
              Passer au TP : {nextLab.title}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : lesson?.next_id ? (
          <Button asChild>
            <Link to="/lessons/$lessonId" params={{ lessonId: lesson.next_id }}>
              Leçon suivante
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : lesson ? (
          <Button asChild>
            <Link to="/chapters/$chapterId" params={{ chapterId: lesson.chapter.id }}>
              Retour au module
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/** Vrai quand au moins un tiers de l'élément est à l'écran (les raccourcis clavier ne s'activent qu'alors). */
function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting), { threshold: 0.33 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return inView
}

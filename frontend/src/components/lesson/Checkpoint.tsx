import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, CircleHelp, CornerDownLeft, RotateCcw, Sparkles, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { use, useRef, useState } from 'react'
import { CodeBlock } from '@/components/CodeBlock'
import { announceXp } from '@/features/xp/xp-events'
import { api, type CheckpointResult, type Lesson } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Md } from '@/components/LessonBody'
import { LessonContext } from './context'

/** Question intégrée au fil de la leçon (directive ::checkpoint{id}). */
export function CheckpointCard({ id }: { id: string }) {
  const { lessonId, checkpoints, checkpointOrder, language } = use(LessonContext)
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const cp = checkpoints.find((c) => c.id === id)
  const index = checkpointOrder.indexOf(id)
  const total = checkpointOrder.length

  const [single, setSingle] = useState<number | null>(null)
  const [multiple, setMultiple] = useState<number[]>([])
  const [text, setText] = useState('')
  const [result, setResult] = useState<CheckpointResult | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  // Réponse demandée au serveur (après un essai raté) : la réussite qui suit ne rapporte plus d'XP.
  const [answerShown, setAnswerShown] = useState<{ expected: unknown; explanation: string } | null>(null)
  const [reopened, setReopened] = useState(false)
  const cardRef = useRef<HTMLElement>(null)

  const submit = useMutation({
    mutationFn: (answer: unknown) => api.answerCheckpoint(lessonId!, id, answer),
    onSuccess: (r) => {
      setResult(r)
      setShowAnswer(false)
      const lesson = qc.getQueryData<Lesson>(['lesson', lessonId])
      qc.setQueryData<Lesson>(['lesson', lessonId], (l) => {
        if (!l) return l
        const checkpoints = l.checkpoints?.map((c) => (c.id === id ? { ...c, tried: true, answered: c.answered || r.correct } : c))
        const done = checkpoints?.filter((c) => c.answered).length ?? 0
        return {
          ...l,
          checkpoints,
          completed: l.completed || !!r.lesson_completed,
          requirement: l.requirement?.kind === 'checkpoints' ? { ...l.requirement, done } : l.requirement,
        }
      })
      if (!r.correct) return
      if (r.xp_awarded > 0) announceXp({ amount: r.xp_awarded, reason: 'Point de contrôle', kind: 'checkpoint' })
      if (r.lesson_completed) {
        // Dernier point de contrôle réussi : la leçon est validée, sans bouton à cliquer.
        announceXp({ amount: r.lesson_completed.xp_awarded, reason: 'Leçon validée', kind: 'lesson', title: lesson?.title })
        qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'lesson' })
      } else {
        qc.invalidateQueries({ queryKey: ['progress'] })
      }
    },
  })

  const revealAnswer = useMutation({
    mutationFn: () => api.revealCheckpoint(lessonId!, id),
    onSuccess: (r) => {
      setAnswerShown(r)
      setShowAnswer(true)
      qc.setQueryData<Lesson>(['lesson', lessonId], (l) =>
        l ? { ...l, checkpoints: l.checkpoints?.map((c) => (c.id === id ? { ...c, revealed: true } : c)) } : l,
      )
    },
  })

  // Directive orpheline (ou backend sans points de contrôle) : on n'affiche rien.
  if (!cp || !lessonId) return null

  const label = `Point de contrôle ${index + 1} sur ${total}`

  if (cp.answered && !reopened && !result) {
    return (
      <div id={`checkpoint-${id}`} className="checkpoint is-solved scroll-mt-24">
        <span className="checkpoint-badge is-pass" aria-hidden="true">
          <Check className="size-4" strokeWidth={3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="checkpoint-kicker">
            {label} <span className="text-pass">· Déjà réussi</span>
          </p>
          <p className="truncate text-[0.95rem] text-muted">{cp.prompt.replace(/`/g, '')}</p>
        </div>
        <button type="button" className="checkpoint-ghost" onClick={() => setReopened(true)}>
          Revoir
        </button>
      </div>
    )
  }

  const isChoice = cp.type !== 'code-output'
  const answer = cp.type === 'single' ? single : cp.type === 'multiple' ? multiple : text
  const ready = cp.type === 'single' ? single !== null : cp.type === 'multiple' ? multiple.length > 0 : text.trim() !== ''
  const locked = !!result || submit.isPending
  const shownExpected = result?.expected ?? answerShown?.expected ?? null
  const explanation = result?.explanation || answerShown?.explanation || ''
  const expected: number[] =
    result && isChoice && shownExpected !== null
      ? Array.isArray(shownExpected)
        ? (shownExpected as number[])
        : [shownExpected as number]
      : []
  const revealed = !!cp.revealed || !!answerShown
  const reveal = !!result && (result.correct || showAnswer)

  const pick = (i: number) => {
    if (locked) return
    if (cp.type === 'single') setSingle(i)
    else setMultiple((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]))
  }
  const validate = () => ready && !locked && submit.mutate(answer)
  const retry = () => {
    setResult(null)
    setShowAnswer(false)
    setSingle(null)
    setMultiple([])
    // Le bouton « Réessayer » disparaît : on rend le focus aux choix pour garder le clavier.
    requestAnimationFrame(() =>
      cardRef.current?.querySelector<HTMLElement>('.checkpoint-choice, .checkpoint-output')?.focus(),
    )
  }

  return (
    <section
      ref={cardRef}
      id={`checkpoint-${id}`}
      className={cn('checkpoint scroll-mt-24', result && (result.correct ? 'is-pass' : 'is-fail'))}
      aria-label={label}
      onKeyDown={(e) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'TEXTAREA') {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            validate()
          }
          return
        }
        if (isChoice && /^[1-9]$/.test(e.key) && Number(e.key) <= cp.choices.length) {
          e.preventDefault()
          pick(Number(e.key) - 1)
        } else if (e.key === 'Enter' && ready && !result) {
          e.preventDefault()
          validate()
        }
      }}
    >
      <header className="checkpoint-head">
        <span className={cn('checkpoint-badge', result && (result.correct ? 'is-pass' : 'is-fail'))} aria-hidden="true">
          {result ? result.correct ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" strokeWidth={3} /> : <CircleHelp className="size-4" />}
        </span>
        <p className="checkpoint-kicker">
          Point de contrôle
          <span className="font-code text-muted">
            {' '}
            {index + 1}/{total}
          </span>
        </p>
        {!cp.answered && !result?.correct && !revealed && (
          <span className="checkpoint-xp">
            <Sparkles className="size-3" aria-hidden="true" />
            +3 XP
          </span>
        )}
      </header>

      <div className="checkpoint-prompt">
        <Md>{cp.prompt}</Md>
      </div>
      {cp.code && <CodeBlock code={cp.code} language={language} copy={false} className="mt-3" />}

      {isChoice ? (
        <ul className="checkpoint-choices" aria-label={cp.type === 'multiple' ? 'Plusieurs réponses possibles' : 'Une seule réponse'}>
          {cp.choices.map((choice, i) => {
            const selected = cp.type === 'single' ? single === i : multiple.includes(i)
            const good = reveal && expected.includes(i)
            const bad = !!result && selected && !expected.includes(i) && (reveal || !result.correct)
            return (
              <li key={i}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={locked}
                  onClick={() => pick(i)}
                  className={cn('checkpoint-choice', selected && 'is-selected', good && 'is-good', bad && 'is-bad')}
                >
                  <kbd className="checkpoint-key" aria-hidden="true">
                    {i + 1}
                  </kbd>
                  <span className="min-w-0 flex-1">
                    <Md components={{ p: ({ children }) => <>{children}</> }}>{choice}</Md>
                  </span>
                  {good && <Check className="size-4 shrink-0 text-pass" aria-label="bonne réponse" />}
                  {bad && <X className="size-4 shrink-0 text-fail" aria-label="ton choix" />}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm text-muted">Ce que le programme affiche</span>
          <textarea
            value={text}
            disabled={locked}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            spellCheck={false}
            className="checkpoint-output"
          />
        </label>
      )}

      {!result ? (
        <div className="checkpoint-actions">
          <button type="button" className="checkpoint-submit" disabled={!ready || submit.isPending} onClick={validate}>
            Valider
            <CornerDownLeft className="size-3.5 opacity-70" aria-hidden="true" />
          </button>
          <span className="hidden text-xs text-muted sm:inline">
            {isChoice ? `Touches 1 à ${cp.choices.length}, puis Entrée` : 'Ctrl + Entrée pour valider'}
          </span>
          {submit.isError && <span className="text-sm text-fail">Envoi impossible, réessaie.</span>}
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {result && (
          <motion.div
            key={`${result.correct}-${showAnswer}`}
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="checkpoint-result" role="status">
              <p className="flex flex-wrap items-center gap-x-2 font-medium">
                {result.correct ? 'Exact.' : 'Pas tout à fait.'}
                {result.xp_awarded > 0 && (
                  <motion.span
                    className="checkpoint-gain"
                    initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  >
                    +{result.xp_awarded} XP
                  </motion.span>
                )}
                {!result.correct && !showAnswer && (
                  <span className="font-normal text-muted">Relis le passage au-dessus et retente.</span>
                )}
              </p>
              {result.correct && result.revealed && result.xp_awarded === 0 && (
                <p className="mt-1 text-sm text-muted">Sans XP : la réponse avait été affichée. Le point compte quand même pour valider la leçon.</p>
              )}
              {reveal && !isChoice && !result.correct && shownExpected !== null && (
                <pre className="mt-2 font-code text-sm">{String(shownExpected)}</pre>
              )}
              {reveal && explanation && <p className="mt-1.5 text-muted">{explanation}</p>}
              {result.lesson_completed && (
                <p className="mt-2 flex items-center gap-1.5 font-medium text-pass">
                  <Check className="size-4" strokeWidth={3} aria-hidden="true" /> Tous les points de contrôle sont réussis : leçon validée.
                </p>
              )}
              {!result.correct && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="checkpoint-submit" onClick={retry} autoFocus>
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    Réessayer
                  </button>
                  {!showAnswer && (
                    <button
                      type="button"
                      className="checkpoint-ghost"
                      disabled={revealAnswer.isPending}
                      onClick={() => (answerShown ? setShowAnswer(true) : revealAnswer.mutate())}
                      title={revealed ? undefined : 'La réussite qui suit ne rapportera plus d’XP'}
                    >
                      Voir la réponse{revealed ? '' : ' (sans XP)'}
                    </button>
                  )}
                  {revealAnswer.isError && <span className="self-center text-sm text-fail">Réponse indisponible, réessaie.</span>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

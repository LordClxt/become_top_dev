import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Check, CornerDownLeft, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CodeBlock } from '@/components/CodeBlock'
import { Md } from '@/components/LessonBody'
import { play } from '@/features/juice/sound'
import { api, type ReviewAnswer, type ReviewCard } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Une erreur passée, rejouée en révision : on répond pour de vrai (pas d'auto-évaluation), la correction
 * décide de la boîte. Mêmes contrôles qu'un point de contrôle : touches 1 à 9, Entrée, Ctrl+Entrée.
 */
export function QuestionReview({ card, onDone }: { card: ReviewCard; onDone: (correct: boolean, result: ReviewAnswer | null) => void }) {
  const q = card.question!
  const [single, setSingle] = useState<number | null>(null)
  const [multiple, setMultiple] = useState<number[]>([])
  const [text, setText] = useState('')
  const ref = useRef<HTMLElement>(null)
  const isChoice = q.type !== 'code-output'

  const submit = useMutation({
    mutationFn: (answer: unknown) => api.answerReviewCard(card.id, answer),
    onSuccess: (r) => play(r.correct ? 'correct' : 'wrong'),
  })
  const result = submit.data ?? null
  const answer = q.type === 'single' ? single : q.type === 'multiple' ? multiple : text
  const ready = q.type === 'single' ? single !== null : q.type === 'multiple' ? multiple.length > 0 : text.trim() !== ''
  const expected: number[] =
    result && isChoice ? (Array.isArray(result.expected) ? (result.expected as number[]) : [result.expected as number]) : []

  // Une seule sortie : pendant l'animation de départ, la carte reste montée et entend encore Entrée.
  const left = useRef(false)
  const leave = (correct: boolean, r: ReviewAnswer | null) => {
    if (left.current) return
    left.current = true
    onDone(correct, r)
  }
  const validate = () => ready && !submit.isPending && !result && !left.current && submit.mutate(answer)
  const next = () => result && leave(result.correct, result)
  const pick = (i: number) => {
    if (result) return
    if (q.type === 'single') setSingle(i)
    else setMultiple((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]))
  }

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('.checkpoint-choice, .checkpoint-output')?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (left.current || (e.metaKey && e.key !== 'Enter')) return
      const typing = (e.target as HTMLElement | null)?.tagName === 'TEXTAREA'
      if (e.key === 'Enter' && (!typing || e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (result) next()
        else validate()
      } else if (!typing && isChoice && /^[1-9]$/.test(e.key) && Number(e.key) <= q.choices.length) {
        e.preventDefault()
        pick(Number(e.key) - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <section
      ref={ref}
      className={cn('checkpoint !my-0 min-h-72', result && (result.correct ? 'is-pass' : 'is-fail'))}
      aria-label="Erreur à rejouer"
    >
      <header className="checkpoint-head">
        <p className="checkpoint-kicker">
          Erreur à rejouer
          <span className="text-muted"> · {q.source === 'quiz' ? 'quiz de la leçon' : 'point de contrôle'}</span>
        </p>
      </header>
      <div className="checkpoint-prompt">
        <Md>{q.prompt}</Md>
      </div>
      {q.code && <CodeBlock code={q.code} language={q.language} copy={false} className="mt-3" />}

      {isChoice ? (
        <ul className="checkpoint-choices" aria-label={q.type === 'multiple' ? 'Plusieurs réponses possibles' : 'Une seule réponse'}>
          {q.choices.map((choice, i) => {
            const selected = q.type === 'single' ? single === i : multiple.includes(i)
            const good = !!result && expected.includes(i)
            const bad = !!result && selected && !expected.includes(i)
            return (
              <li key={i}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={!!result}
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
            disabled={!!result}
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
            {isChoice ? `Touches 1 à ${q.choices.length}, puis Entrée` : 'Ctrl + Entrée pour valider'}
          </span>
          {submit.isError && (
            <button type="button" className="text-sm text-fail underline" onClick={() => leave(false, null)}>
              Envoi impossible : passer cette carte
            </button>
          )}
        </div>
      ) : (
        <div className="checkpoint-result" role="status">
          <p className="font-medium">{result.correct ? 'Exact : cette fois, c’est acquis.' : 'Encore raté : elle reviendra demain.'}</p>
          {!isChoice && !result.correct && <pre className="mt-2 font-code text-sm">{String(result.expected)}</pre>}
          {result.explanation && <p className="mt-1.5 text-muted">{result.explanation}</p>}
          <div className="mt-3">
            <button type="button" className="checkpoint-submit" onClick={next}>
              Carte suivante <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

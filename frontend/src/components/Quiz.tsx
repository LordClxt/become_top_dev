import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { CodeBlock } from '@/components/CodeBlock'
import { SliceMeter } from '@/components/SliceMeter'
import { Button } from '@/components/ui/button'
import { announceXp } from '@/features/xp/xp-events'
import { type AnswerResult, api, type QuizQuestion } from '@/lib/api'
import { cn } from '@/lib/utils'

export function Quiz({ quizId }: { quizId: string }) {
  const { data } = useQuery({ queryKey: ['quiz', quizId], queryFn: () => api.quiz(quizId) })
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Record<string, AnswerResult>>({})
  if (!data) return null

  const question = data.questions[index]
  const answeredCount = data.questions.filter((q) => q.answered || results[q.id]).length
  if (!question) return null
  const correct = Object.values(results).filter((r) => r.correct).length
  const answeredHere = Object.keys(results).length

  return (
    <section className="mt-12 rounded-2xl border border-line bg-surface/60 p-6 md:p-8" aria-labelledby="quiz-title">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 id="quiz-title" className="font-read text-2xl font-semibold">
          Vérifie ta compréhension
        </h2>
        <SliceMeter len={answeredCount} cap={data.questions.length} size="sm" />
      </div>
      {answeredCount === data.questions.length && (
        <p className="mb-6 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm" role="status">
          <span className="font-medium">Quiz terminé.</span>{' '}
          <span className="text-muted">
            {correct} bonne{correct > 1 ? 's' : ''} réponse{correct > 1 ? 's' : ''} sur {answeredHere} dans cette session.
          </span>
        </p>
      )}
      <QuestionCard
        key={question.id}
        quizId={quizId}
        question={question}
        result={results[question.id]}
        onResult={(r) => setResults((prev) => ({ ...prev, [question.id]: r }))}
      />
      <div className="mt-6 flex justify-between">
        <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Question précédente
        </Button>
        <span className="self-center text-sm text-muted tabular-nums">
          {index + 1} / {data.questions.length}
        </span>
        <Button
          variant="ghost"
          disabled={index === data.questions.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Question suivante
        </Button>
      </div>
    </section>
  )
}

function QuestionCard({
  quizId,
  question: q,
  result,
  onResult,
}: {
  quizId: string
  question: QuizQuestion
  result?: AnswerResult
  onResult: (r: AnswerResult) => void
}) {
  const qc = useQueryClient()
  const [single, setSingle] = useState<number | null>(null)
  const [multiple, setMultiple] = useState<number[]>([])
  const [text, setText] = useState('')

  const answer = q.type === 'single' ? single : q.type === 'multiple' ? multiple : text
  const ready = q.type === 'single' ? single !== null : q.type === 'multiple' ? multiple.length > 0 : text.trim() !== ''

  const submit = useMutation({
    mutationFn: () => api.answer(quizId, q.id, answer),
    onSuccess: (r) => {
      announceXp({ amount: r.xp_awarded, reason: 'Bonne réponse' })
      onResult(r)
      qc.invalidateQueries({ queryKey: ['progress'] })
    },
  })

  const expectedIndexes = (): number[] =>
    result ? (Array.isArray(result.expected) ? (result.expected as number[]) : [result.expected as number]) : []

  return (
    <div>
      <p className="text-lg">{q.prompt}</p>
      {q.code && <div className="mt-4">{<CodeBlock code={q.code} />}</div>}
      {q.answered && !result && (
        <p className="mt-2 text-sm text-muted">Déjà répondue : tu peux réessayer, sans XP cette fois.</p>
      )}

      {(q.type === 'single' || q.type === 'multiple') && (
        <ul className="mt-4 grid gap-2">
          {q.choices.map((choice, i) => {
            const selected = q.type === 'single' ? single === i : multiple.includes(i)
            const isExpected = result && expectedIndexes().includes(i)
            return (
              <li key={choice}>
                <button
                  type="button"
                  disabled={!!result}
                  aria-pressed={selected}
                  onClick={() =>
                    q.type === 'single'
                      ? setSingle(i)
                      : setMultiple((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]))
                  }
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors',
                    selected ? 'border-accent bg-surface' : 'border-line hover:border-muted',
                    result && isExpected && 'border-pass',
                    result && selected && !isExpected && 'border-fail',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1 size-3.5 shrink-0 border',
                      q.type === 'single' ? 'rounded-full' : 'rounded-[3px]',
                      selected ? 'border-accent bg-accent' : 'border-muted',
                    )}
                  />
                  <span>{choice}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {q.type === 'code-output' && (
        <label className="mt-4 block">
          <span className="mb-2 block text-sm text-muted">Ce que le programme affiche</span>
          <textarea
            value={text}
            disabled={!!result}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            spellCheck={false}
            className="w-full rounded-md border border-line bg-surface p-3 font-code text-sm outline-none focus:border-accent"
          />
        </label>
      )}

      {!result ? (
        <Button className="mt-5" disabled={!ready || submit.isPending} onClick={() => submit.mutate()}>
          Valider ma réponse
        </Button>
      ) : (
        <div
          className={cn(
            'mt-5 rounded-md border-l-4 bg-surface p-4',
            result.correct ? 'border-pass' : 'border-fail',
          )}
          role="status"
        >
          <p className="flex items-center gap-2 font-medium">
            {result.correct ? <Check className="size-4 text-pass" /> : <X className="size-4 text-fail" />}
            {result.correct ? 'Bonne réponse' : 'Pas tout à fait'}
            {result.xp_awarded > 0 && <span className="text-accent">+{result.xp_awarded} XP</span>}
          </p>
          {!result.correct && q.type === 'code-output' && (
            <pre className="mt-3 font-code text-sm">{String(result.expected)}</pre>
          )}
          <p className="mt-2 text-muted">{result.explanation}</p>
        </div>
      )}
    </div>
  )
}

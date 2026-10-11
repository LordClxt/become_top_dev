/**
 * Fiche interactive : des blocs (nombre, choix, ordre, rangement, tableau, curseurs) que l'élève remplit, puis
 * vérifie. La correction est faite par le backend (voir backend/internal/service/worksheet.go), jamais ici.
 */
import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonBody } from '@/components/LessonBody'
import type { RunReport, Worksheet as WorksheetSpec, WSBlock } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ChoiceBlock, MatchBlock, MultiBlock, NumberBlock, OrderBlock, TableBlock } from './blocks'
import { Tuner } from './Tuner'

type Answers = Record<string, unknown>

function parse(raw: string): Answers {
  try {
    const v = JSON.parse(raw) as unknown
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Answers) : {}
  } catch {
    return {}
  }
}

export function Worksheet({
  exerciseId,
  sheet,
  value,
  onChange,
  report,
}: {
  exerciseId: string
  sheet: WorksheetSpec
  value: string
  onChange: (v: string) => void
  report?: RunReport
}) {
  const [answers, setAnswers] = useState<Answers>(() => parse(value))
  // Blocs modifiés depuis la dernière vérification : leur verdict n'est plus à jour.
  const [stale, setStale] = useState<Set<string>>(new Set())
  useEffect(() => setStale(new Set()), [report])

  const emit = useRef(onChange)
  emit.current = onChange
  const set = (block: WSBlock, v: unknown) => {
    const next = { ...answers, [block.id]: v }
    setAnswers(next)
    setStale((s) => new Set(s).add(block.id))
    emit.current(JSON.stringify(next))
  }

  const verdicts = useMemo(() => {
    const m = new Map<string, { passed: boolean; messages: string[] }>()
    if (!report) return m
    for (const b of sheet.blocks) {
      const names = b.type === 'tuner' ? b.goals.map((g) => g.label) : [b.title]
      const tests = report.tests.filter((t) => names.includes(t.name))
      if (tests.length === 0) continue
      m.set(b.id, { passed: tests.every((t) => t.status === 'pass'), messages: tests.filter((t) => t.output).map((t) => t.output) })
    }
    return m
  }, [report, sheet.blocks])

  return (
    <div className="mx-auto grid max-w-[880px] gap-5 px-6 py-6 pb-14">
      {sheet.intro && (
        <div className="[&_.prose-read]:text-[0.95rem]">
          <LessonBody body={sheet.intro} visuals={{}} />
        </div>
      )}
      {sheet.blocks.map((b, i) => {
        const verdict = stale.has(b.id) ? undefined : verdicts.get(b.id)
        return (
          <section
            key={b.id}
            className="ws-card p-5"
            data-state={verdict ? (verdict.passed ? 'pass' : 'fail') : undefined}
            aria-labelledby={`ws-${b.id}`}
          >
            <header className="flex items-start gap-3">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-surface-2 font-code text-xs text-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <h2 id={`ws-${b.id}`} className="text-base font-semibold">
                  {b.title}
                </h2>
                {b.prompt && (
                  <div className="mt-1.5 [&_.prose-read]:text-sm">
                    <LessonBody body={b.prompt} visuals={{}} />
                  </div>
                )}
              </div>
              {verdict && (
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                    verdict.passed ? 'bg-pass/15 text-pass' : 'bg-fail/15 text-fail',
                  )}
                >
                  {verdict.passed ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
                  {verdict.passed ? 'Juste' : 'À revoir'}
                </span>
              )}
            </header>
            <div className="mt-4">
              <BlockBody exerciseId={exerciseId} block={b} answers={answers} onChange={(v) => set(b, v)} json={JSON.stringify(answers)} />
            </div>
            {verdict && !verdict.passed && verdict.messages.length > 0 && (
              <ul className="mt-4 grid gap-1.5 border-t border-line pt-3 text-sm leading-snug text-fail/90">
                {verdict.messages.map((m, k) => (
                  <li key={k}>{m}</li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function BlockBody({
  exerciseId,
  block,
  answers,
  onChange,
  json,
}: {
  exerciseId: string
  block: WSBlock
  answers: Answers
  onChange: (v: unknown) => void
  json: string
}) {
  const value = answers[block.id]
  switch (block.type) {
    case 'number':
      return <NumberBlock block={block} value={value as string | number | undefined} onChange={onChange} />
    case 'choice':
      return <ChoiceBlock block={block} value={value as string | undefined} onChange={onChange} />
    case 'multi':
      return <MultiBlock block={block} value={value as string[] | undefined} onChange={onChange} />
    case 'order':
      return <OrderBlock block={block} value={value as string[] | undefined} onChange={onChange} />
    case 'match':
      return <MatchBlock block={block} value={value as Record<string, string> | undefined} onChange={onChange} />
    case 'table':
      return <TableBlock block={block} value={value as Record<string, string> | undefined} onChange={onChange} />
    case 'tuner':
      return (
        <Tuner
          exerciseId={exerciseId}
          block={block}
          answersJson={json}
          value={value as Record<string, number | string> | undefined}
          onChange={onChange}
        />
      )
  }
}

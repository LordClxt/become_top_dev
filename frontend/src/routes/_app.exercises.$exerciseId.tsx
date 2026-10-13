import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, ClipboardList, Lightbulb, ListChecks, Play, RotateCcw, Workflow } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CodeEditor, editorLanguage } from '@/components/CodeEditor'
import { DiagramEditor } from '@/components/diagram/DiagramEditor'
import { LessonBody } from '@/components/LessonBody'
import { ErrorState, Loading } from '@/components/states'
import { TestResults } from '@/components/TestResults'
import { Worksheet } from '@/components/worksheet/Worksheet'
import { Button } from '@/components/ui/button'
import { announceXp } from '@/features/xp/xp-events'
import { api, type Exercise } from '@/lib/api'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/exercises/$exerciseId')({ component: ExercisePage })

const ROLE_LABEL: Record<Exercise['role'], string> = {
  lab: 'TP',
  assignment: 'Devoir',
  boss: 'Boss',
  project: 'Projet fil rouge',
}

function ExercisePage() {
  const { exerciseId } = Route.useParams()
  const { data, error, isPending } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: () => api.exercise(exerciseId),
  })
  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} />
  return <Workspace key={data.id} exercise={data} />
}

function Workspace({ exercise: ex }: { exercise: Exercise }) {
  const qc = useQueryClient()
  const [files, setFiles] = useState(ex.workspace.editable)
  const [active, setActive] = useState(Object.keys(ex.workspace.editable)[0] ?? '')
  const [hints, setHints] = useState(ex.workspace.hints_revealed)
  // Incrémenté à chaque remise à zéro : l'éditeur repart de l'état de départ.
  const [editorKey, setEditorKey] = useState(0)
  const isDiagram = ex.kind === 'diagram'
  const isSheet = ex.kind === 'worksheet'
  const noCode = isDiagram || isSheet
  const editableNames = Object.keys(files)
  const allNames = [...editableNames, ...Object.keys(ex.workspace.readonly)]

  // Sauvegarde automatique du brouillon, 1,5 s après la dernière frappe.
  const dirty = useRef(false)
  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(() => api.saveDraft(ex.id, files), 1500)
    return () => clearTimeout(t)
  }, [ex.id, files])

  const run = useMutation({
    mutationFn: () => api.run(ex.id, files),
    onSuccess: (r) => {
      if (!r.passed) return
      announceXp({ amount: r.xp_awarded, reason: `${ROLE_LABEL[ex.role]} réussi` })
      qc.invalidateQueries()
    },
  })
  const runTests = useCallback(() => {
    if (!run.isPending) run.mutate()
  }, [run])

  const hint = useMutation({
    mutationFn: () => api.revealHint(ex.id),
    onSuccess: (r) => setHints(r.hints),
  })
  const reset = useMutation({
    mutationFn: () => api.resetExercise(ex.id),
    onSuccess: async () => {
      dirty.current = false
      const fresh = await api.exercise(ex.id)
      qc.setQueryData(['exercise', ex.id], fresh)
      setFiles(fresh.workspace.editable)
      setEditorKey((k) => k + 1)
    },
  })

  // Contenu des autres fichiers pour l'autocomplétion ; stable tant qu'on ne tape que dans le fichier actif.
  const otherFilesKey = JSON.stringify(
    Object.entries({ ...files, ...ex.workspace.readonly })
      .filter(([name]) => name !== active)
      .map(([, src]) => src),
  )
  const otherFiles = useMemo(() => JSON.parse(otherFilesKey) as string[], [otherFilesKey])
  const language = editorLanguage(active, ex.language)

  const passed = ex.workspace.passed || run.data?.passed
  const debrief = run.data?.debrief || ex.debrief
  // Blocs et flèches fautifs d'un diagramme : le premier message gagne.
  const errors = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of run.data?.tests ?? []) {
      if (t.status !== 'fail') continue
      for (const ref of t.refs ?? []) if (!m.has(ref)) m.set(ref, t.output)
    }
    return m
  }, [run.data])
  const backTo = ex.lesson_id
    ? ({ to: '/lessons/$lessonId', params: { lessonId: ex.lesson_id } } as const)
    : ex.chapter_id
      ? ({ to: '/chapters/$chapterId', params: { chapterId: ex.chapter_id } } as const)
      : ({ to: '/sandbox' } as const)
  const inSandbox = !ex.lesson_id && !ex.chapter_id

  return (
    <main
      className={cn(
        'grid h-[calc(100vh-3.5rem)] grid-cols-1',
        noCode ? 'lg:grid-cols-[minmax(300px,27%)_1fr]' : 'lg:grid-cols-[minmax(340px,38%)_1fr]',
      )}
    >
      {/* Énoncé */}
      <section className="overflow-y-auto border-r border-line px-8 pt-8 pb-16">
        <Link {...backTo} className="inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          <ChevronLeft className="size-4" />
          {ex.lesson_id ? 'Retour à la leçon' : inSandbox ? 'Retour à l’atelier' : 'Retour au module'}
        </Link>
        <p className={cn('mt-5 text-sm', ex.role === 'boss' ? 'text-fail' : 'text-muted')}>
          {inSandbox ? (isDiagram ? 'Kata de diagramme' : isSheet ? 'Fiche' : 'Atelier') : ROLE_LABEL[ex.role]}, difficulté {ex.difficulty}/5,{' '}
          {ex.xp} XP
          {passed && <span className="text-pass">, réussi</span>}
        </p>
        <h1 className="mt-2 font-read text-3xl leading-tight font-semibold tracking-tight">{ex.title}</h1>
        <div className="mt-6 [&_.prose-read]:text-base">
          <LessonBody body={ex.instructions} visuals={{}} />
        </div>

        {noCode && ex.checks.length > 0 && (
          <div className="mt-8">
            <h2 className="flex items-center gap-2 font-medium">
              <ListChecks className="size-4 text-accent" /> Ce qui est vérifié
            </h2>
            <ul className="mt-3 grid gap-2 text-sm leading-snug">
              {ex.checks.map((c) => {
                const result = run.data?.tests.find((t) => t.name === c.label)
                return (
                  <li key={c.id} className="flex gap-2.5">
                    <span
                      className={cn(
                        'mt-1 size-2.5 shrink-0 rounded-[2px]',
                        result?.status === 'pass' ? 'bg-pass' : result?.status === 'fail' ? 'bg-fail' : 'bg-cell-empty',
                      )}
                      aria-hidden="true"
                    />
                    {c.label}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {ex.milestones.length > 0 && (
          <div className="mt-8">
            <h2 className="font-medium">Étapes</h2>
            <ol className="mt-3 grid gap-3 text-sm">
              {ex.milestones.map((m, i) => (
                <li key={m.id} className="grid grid-cols-[1.5rem_1fr]">
                  <span className="text-muted">{i + 1}</span>
                  <span>
                    <span className="font-medium">{m.title}</span>
                    <span className="block text-muted">{m.goal}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {ex.rubric.length > 0 && (
          <div className="mt-8">
            <h2 className="font-medium">Grille d'évaluation</h2>
            <ul className="mt-3 grid gap-1.5 text-sm">
              {ex.rubric.map((c) => (
                <li key={c.id} className="flex justify-between gap-4">
                  <span>{c.label}</span>
                  <span className="text-muted tabular-nums">
                    {Math.round(c.weight * 100)} % · {c.source === 'tests' ? 'tests' : 'revue'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {ex.workspace.hints_total > 0 && (
          <div className="mt-10 border-t border-line pt-6">
            <h2 className="flex items-center gap-2 font-medium">
              <Lightbulb className="size-4 text-fail" /> Indices
            </h2>
            <ol className="mt-3 grid gap-3">
              {hints.map((h, i) => (
                <li key={i} className="rounded-md bg-surface p-4 text-sm leading-relaxed [&_.prose-read]:text-sm">
                  <LessonBody body={h} visuals={{}} />
                </li>
              ))}
            </ol>
            {hints.length < ex.workspace.hints_total && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => hint.mutate()}
                disabled={hint.isPending}
              >
                Voir l'indice {hints.length + 1} sur {ex.workspace.hints_total}
              </Button>
            )}
            {!passed && (
              <p className="mt-2 text-xs text-muted">Chaque indice réduit l'XP de ce TP de 20 %.</p>
            )}
          </div>
        )}

        {ex.source && (
          <p className="mt-10 text-xs text-muted">
            Source : chapitre {ex.source.chapter}, pages {ex.source.pages}
          </p>
        )}
      </section>

      {/* Éditeur + résultats */}
      <section
        className={cn(
          'grid min-h-0',
          noCode ? 'grid-rows-[auto_minmax(0,1fr)_minmax(110px,24%)]' : 'grid-rows-[auto_minmax(0,1fr)_minmax(140px,34%)]',
        )}
      >
        <div className="flex items-center justify-between border-b border-line pr-3">
          {noCode ? (
            <p className="flex items-center gap-2 px-4 py-2.5 text-sm">
              {isDiagram ? <Workflow className="size-4 text-accent" /> : <ClipboardList className="size-4 text-accent" />}
              <span className="font-medium">{isDiagram ? 'Ton diagramme' : 'Ta fiche'}</span>
              <span className="text-muted">enregistré{isDiagram ? '' : 'e'} automatiquement</span>
            </p>
          ) : (
          <div className="flex overflow-x-auto" role="tablist" aria-label="Fichiers">
            {allNames.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={active === name}
                onClick={() => setActive(name)}
                className={cn(
                  'border-b-2 px-4 py-2.5 font-code text-xs whitespace-nowrap',
                  active === name ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text',
                )}
              >
                {name}
                {!editableNames.includes(name) && <span className="ml-1.5 text-muted">(lecture)</span>}
              </button>
            ))}
          </div>
          )}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const what = isDiagram ? 'le diagramme de départ' : isSheet ? 'une fiche vierge' : 'le code de départ'
                if (confirm(`Remettre ${what} ? Ton brouillon sera perdu.`)) reset.mutate()
              }}
            >
              <RotateCcw /> {isDiagram ? 'Repartir du départ' : isSheet ? 'Tout effacer' : 'Code de départ'}
            </Button>
            <Button size="sm" onClick={runTests} disabled={run.isPending}>
              <Play /> {isDiagram ? 'Vérifier le diagramme' : isSheet ? 'Vérifier mes réponses' : 'Lancer les tests'}
            </Button>
          </div>
        </div>

        <div className="min-h-0 overflow-hidden">
          {isDiagram ? (
            <DiagramEditor
              key={editorKey}
              palette={ex.palette}
              errors={errors}
              value={files['diagram.json'] ?? '{}'}
              onChange={(v) => {
                dirty.current = true
                setFiles({ 'diagram.json': v })
              }}
            />
          ) : isSheet && ex.worksheet ? (
            <div className="h-full overflow-y-auto">
              <Worksheet
                key={editorKey}
                exerciseId={ex.id}
                sheet={ex.worksheet}
                value={files['answers.json'] ?? '{}'}
                report={run.data}
                onChange={(v) => {
                  dirty.current = true
                  setFiles({ 'answers.json': v })
                }}
              />
            </div>
          ) : editableNames.includes(active) ? (
            <CodeEditor
              value={files[active] ?? ''}
              language={language}
              otherFiles={otherFiles}
              onRun={runTests}
              onChange={(v) => {
                dirty.current = true
                setFiles((f) => ({ ...f, [active]: v }))
              }}
            />
          ) : (
            <CodeEditor value={ex.workspace.readonly[active] ?? ''} language={language} readOnly />
          )}
        </div>

        <div className="overflow-y-auto border-t border-line bg-ink" aria-live="polite">
          {run.isError ? (
            <p className="p-4 text-sm text-fail">{run.error.message}</p>
          ) : (
            <>
              <TestResults report={run.data} running={run.isPending} diagram={isDiagram} sheet={isSheet} />
              {passed && debrief && (
                <section className="border-t border-line p-5" aria-label="Debrief">
                  <h2 className="flex items-center gap-2 font-medium">
                    <Lightbulb className="size-4 text-accent" /> Ce qu’il fallait retenir
                  </h2>
                  <div className="mt-3 [&_.prose-read]:text-[0.95rem]">
                    <LessonBody body={debrief} visuals={{}} />
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}

import { useState } from 'react'

export const id = 'go-ch04-defer-timeline'

type Step = {
  line: number
  note: string
  vars: string
  stack: string[] // du plus récent (prochain à s'exécuter) au plus ancien
  output: string[]
  result?: string
}

type Scenario = { title: string; code: string[]; steps: Step[] }

const SCENARIOS: Scenario[] = [
  {
    title: 'Ordre et arguments figés',
    code: [
      'func deferExample() int {',
      '\ta := 10',
      '\tdefer func(val int) { fmt.Println("first:", val) }(a)',
      '\ta = 20',
      '\tdefer func(val int) { fmt.Println("second:", val) }(a)',
      '\ta = 30',
      '\tfmt.Println("exiting:", a)',
      '\treturn a',
      '}',
    ],
    steps: [
      { line: 1, note: 'a reçoit 10.', vars: 'a = 10', stack: [], output: [] },
      { line: 2, note: 'Le defer est enregistré. Son argument a est évalué maintenant : val vaut 10, pour toujours.', vars: 'a = 10', stack: ['first (val = 10)'], output: [] },
      { line: 3, note: 'a change, mais le defer a déjà sa valeur : il garde 10.', vars: 'a = 20', stack: ['first (val = 10)'], output: [] },
      { line: 4, note: 'Deuxième defer, empilé au-dessus : val vaut 20.', vars: 'a = 20', stack: ['second (val = 20)', 'first (val = 10)'], output: [] },
      { line: 5, note: 'a vaut 30 ; aucun des deux defer ne le verra.', vars: 'a = 30', stack: ['second (val = 20)', 'first (val = 10)'], output: [] },
      { line: 6, note: 'Le corps de la fonction continue normalement.', vars: 'a = 30', stack: ['second (val = 20)', 'first (val = 10)'], output: ['exiting: 30'] },
      { line: 7, note: 'return a : la valeur de retour (30) est fixée. Les defer ne se sont pas encore exécutés.', vars: 'a = 30', stack: ['second (val = 20)', 'first (val = 10)'], output: ['exiting: 30'], result: '30 (fixée)' },
      { line: 8, note: 'La fonction sort : le defer du dessus de la pile s’exécute en premier (LIFO).', vars: 'a = 30', stack: ['first (val = 10)'], output: ['exiting: 30', 'second: 20'], result: '30' },
      { line: 8, note: 'Puis le plus ancien.', vars: 'a = 30', stack: [], output: ['exiting: 30', 'second: 20', 'first: 10'], result: '30' },
    ],
  },
  {
    title: 'Retour nommé modifié',
    code: ['func f() (n int) {', '\tdefer func() { n *= 2 }()', '\tn = 21', '\treturn n', '}'],
    steps: [
      { line: 0, note: 'Le retour nommé n existe dès l’entrée, à sa valeur zéro.', vars: 'n = 0', stack: [], output: [] },
      { line: 1, note: 'La closure est enregistrée. Elle capture la variable n elle-même, pas sa valeur.', vars: 'n = 0', stack: ['func() { n *= 2 }'], output: [] },
      { line: 2, note: 'n reçoit 21.', vars: 'n = 21', stack: ['func() { n *= 2 }'], output: [] },
      { line: 3, note: 'return n affecte 21 au retour nommé, puis lance les defer.', vars: 'n = 21', stack: ['func() { n *= 2 }'], output: [], result: 'n = 21' },
      { line: 1, note: 'Le defer s’exécute : n *= 2 modifie le résultat renvoyé.', vars: 'n = 42', stack: [], output: [], result: 'n = 42' },
      { line: 4, note: 'La fonction rend la main avec la valeur finale de n : 42.', vars: 'n = 42', stack: [], output: [], result: '42' },
    ],
  },
  {
    title: 'Sans retour nommé',
    code: ['func g() int {', '\tn := 21', '\tdefer func() { n *= 2 }()', '\treturn n', '}'],
    steps: [
      { line: 1, note: 'n est une simple variable locale.', vars: 'n = 21', stack: [], output: [] },
      { line: 2, note: 'La closure capture n, mais elle ne pourra pas changer ce qui est renvoyé.', vars: 'n = 21', stack: ['func() { n *= 2 }'], output: [] },
      { line: 3, note: 'return n COPIE 21 dans la valeur de retour, avant les defer.', vars: 'n = 21', stack: ['func() { n *= 2 }'], output: [], result: '21 (copiée)' },
      { line: 2, note: 'Le defer double la variable locale n, qui n’intéresse plus personne.', vars: 'n = 42', stack: [], output: [], result: '21' },
      { line: 4, note: 'La fonction renvoie 21, pas 42.', vars: 'n = 42', stack: [], output: [], result: '21' },
    ],
  },
]

export default function DeferTimeline() {
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const scenario = SCENARIOS[scenarioIndex]!
  const step = scenario.steps[stepIndex]!

  return (
    <div className="grid gap-5">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Scénarios">
        {SCENARIOS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            role="tab"
            aria-selected={i === scenarioIndex}
            onClick={() => {
              setScenarioIndex(i)
              setStepIndex(0)
            }}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap ${
              i === scenarioIndex ? 'border-accent text-text' : 'border-line text-muted hover:text-text'
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <pre className="overflow-x-auto rounded-md border border-line bg-ink/60 p-3 font-code text-xs leading-6 [tab-size:4]" aria-label="Code">
          {scenario.code.map((text, i) => (
            <div key={i} className={i === step.line ? 'bg-accent/15 text-text' : 'text-muted'}>
              {text || ' '}
            </div>
          ))}
        </pre>

        <div className="grid content-start gap-3 text-sm">
          <p role="status">{step.note}</p>
          <dl className="grid gap-2 font-code text-xs">
            <div className="rounded-md border border-line px-3 py-2">
              <dt className="font-ui text-muted">variables</dt>
              <dd>{step.vars}</dd>
            </div>
            <div className="rounded-md border border-line px-3 py-2">
              <dt className="font-ui text-muted">pile de defer (le prochain à s’exécuter en haut)</dt>
              <dd>
                {step.stack.length === 0 ? (
                  <span className="text-muted">(vide)</span>
                ) : (
                  <ol className="grid gap-1">
                    {step.stack.map((item, i) => (
                      <li key={item} className={i === 0 ? 'text-accent' : ''}>
                        {item}
                      </li>
                    ))}
                  </ol>
                )}
              </dd>
            </div>
            <div className="rounded-md border border-line px-3 py-2">
              <dt className="font-ui text-muted">sortie</dt>
              <dd>{step.output.length ? step.output.join('  ·  ') : <span className="text-muted">(rien)</span>}</dd>
            </div>
            {step.result && (
              <div className="rounded-md border border-accent/50 px-3 py-2">
                <dt className="font-ui text-muted">valeur de retour</dt>
                <dd>{step.result}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button type="button" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0} className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40">
          ← Précédent
        </button>
        <button type="button" onClick={() => setStepIndex((i) => Math.min(scenario.steps.length - 1, i + 1))} disabled={stepIndex >= scenario.steps.length - 1} className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40">
          Suivant →
        </button>
        <span className="text-xs text-muted">
          étape {stepIndex + 1}/{scenario.steps.length}
        </span>
      </div>
    </div>
  )
}

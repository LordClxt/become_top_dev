import { useState } from 'react'

export const id = 'go-ch05-pointer-update'

type Cell = { name: string; scope: string; value: string; target?: string }
type Step = { line: number; note: string; cells: Cell[] }
type Scenario = { title: string; code: string[]; steps: Step[] }

const SCENARIOS: Scenario[] = [
  {
    title: 'Réaffecter le pointeur reçu',
    code: [
      'func failedUpdate(px *int) {',
      '\tx2 := 20',
      '\tpx = &x2',
      '}',
      '',
      'x := 10',
      'failedUpdate(&x)',
      'fmt.Println(x) // 10',
    ],
    steps: [
      { line: 5, note: 'x vaut 10 dans main.', cells: [{ name: 'x', scope: 'main', value: '10' }] },
      {
        line: 6,
        note: 'L’adresse de x est COPIÉE dans le paramètre px. Les deux désignent la même case.',
        cells: [
          { name: 'x', scope: 'main', value: '10' },
          { name: 'px', scope: 'failedUpdate', value: 'adresse de x', target: 'x' },
        ],
      },
      {
        line: 1,
        note: 'Une nouvelle variable locale x2 est créée, avec sa propre case.',
        cells: [
          { name: 'x', scope: 'main', value: '10' },
          { name: 'px', scope: 'failedUpdate', value: 'adresse de x', target: 'x' },
          { name: 'x2', scope: 'failedUpdate', value: '20' },
        ],
      },
      {
        line: 2,
        note: 'px reçoit l’adresse de x2. On a seulement changé la COPIE de l’adresse : x n’est pas touché.',
        cells: [
          { name: 'x', scope: 'main', value: '10' },
          { name: 'px', scope: 'failedUpdate', value: 'adresse de x2', target: 'x2' },
          { name: 'x2', scope: 'failedUpdate', value: '20' },
        ],
      },
      { line: 7, note: 'La fonction est terminée : px et x2 disparaissent. x vaut toujours 10.', cells: [{ name: 'x', scope: 'main', value: '10' }] },
    ],
  },
  {
    title: 'Écrire à travers le pointeur',
    code: ['func update(px *int) {', '\t*px = 20', '}', '', 'x := 10', 'update(&x)', 'fmt.Println(x) // 20'],
    steps: [
      { line: 4, note: 'x vaut 10 dans main.', cells: [{ name: 'x', scope: 'main', value: '10' }] },
      {
        line: 5,
        note: 'L’adresse de x est copiée dans px.',
        cells: [
          { name: 'x', scope: 'main', value: '10' },
          { name: 'px', scope: 'update', value: 'adresse de x', target: 'x' },
        ],
      },
      {
        line: 1,
        note: '*px = 20 suit l’adresse et écrit dans la case de x.',
        cells: [
          { name: 'x', scope: 'main', value: '20' },
          { name: 'px', scope: 'update', value: 'adresse de x', target: 'x' },
        ],
      },
      { line: 6, note: 'Retour dans main : x vaut 20. La modification a traversé l’appel.', cells: [{ name: 'x', scope: 'main', value: '20' }] },
    ],
  },
  {
    title: 'Pointeur nil en paramètre',
    code: ['func set(g *int) {', '\tx := 10', '\tg = &x', '}', '', 'var f *int', 'set(f)', 'fmt.Println(f == nil) // true'],
    steps: [
      { line: 5, note: 'f est un pointeur nil : il ne désigne aucune case.', cells: [{ name: 'f', scope: 'main', value: 'nil' }] },
      {
        line: 6,
        note: 'La valeur de f (nil) est copiée dans g.',
        cells: [
          { name: 'f', scope: 'main', value: 'nil' },
          { name: 'g', scope: 'set', value: 'nil' },
        ],
      },
      {
        line: 1,
        note: 'Une variable locale x est créée.',
        cells: [
          { name: 'f', scope: 'main', value: 'nil' },
          { name: 'g', scope: 'set', value: 'nil' },
          { name: 'x', scope: 'set', value: '10' },
        ],
      },
      {
        line: 2,
        note: 'g pointe maintenant sur x, mais f n’a pas bougé : il n’y a aucun moyen de modifier f depuis set.',
        cells: [
          { name: 'f', scope: 'main', value: 'nil' },
          { name: 'g', scope: 'set', value: 'adresse de x', target: 'x' },
          { name: 'x', scope: 'set', value: '10' },
        ],
      },
      { line: 7, note: 'Au retour, f est toujours nil. Pour obtenir un pointeur, la fonction doit le renvoyer.', cells: [{ name: 'f', scope: 'main', value: 'nil' }] },
    ],
  },
]

export default function PointerUpdate() {
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
          <ul className="grid gap-2" aria-label="Mémoire">
            {step.cells.map((cell) => (
              <li
                key={`${cell.scope}.${cell.name}`}
                className={`grid grid-cols-[auto_1fr] items-center gap-3 rounded-md border px-3 py-2 font-code text-xs ${
                  cell.target ? 'border-accent/60' : 'border-line'
                }`}
              >
                <span className="text-muted">
                  {cell.scope}.{cell.name}
                </span>
                <span>
                  {cell.target ? '→ ' : '= '}
                  {cell.value}
                  {cell.target && <span className="text-muted"> (la case « {cell.target} »)</span>}
                </span>
              </li>
            ))}
          </ul>
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

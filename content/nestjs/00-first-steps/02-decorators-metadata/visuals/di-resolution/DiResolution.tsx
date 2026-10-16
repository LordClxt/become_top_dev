import { useState } from 'react'

export const id = 'nest-ch00-di-resolution'

type Mode = 'import' | 'import-type' | 'interface'

/** Ce que tsc émet pour le 2e paramètre du contrôleur, selon la façon d'écrire le code. */
const SECOND: Record<Mode, { source: string; emitted: string; ok: boolean }> = {
  import: {
    source: "import { Clock } from './clock.js';",
    emitted: 'Clock',
    ok: true,
  },
  'import-type': {
    source: "import type { Clock } from './clock.js';",
    emitted: 'Object',
    ok: false,
  },
  interface: {
    source: 'interface Clock { now(): number }',
    emitted: 'Object',
    ok: false,
  },
}

type Step = { title: string; detail: string; created: string[] }

function steps(mode: Mode): Step[] {
  const second = SECOND[mode]
  const base: Step[] = [
    {
      title: '1. tsc compile la classe décorée',
      detail: `Il ajoute design:paramtypes = [BooksService, ${second.emitted}] : les types deviennent des valeurs.`,
      created: [],
    },
    {
      title: '2. Nest lit design:paramtypes de BooksController',
      detail: 'Avant de construire le contrôleur, il doit construire chacune de ses dépendances.',
      created: [],
    },
    {
      title: '3. Résolution de BooksService',
      detail: 'BooksService a lui-même besoin de BooksRepository : la résolution descend d’abord jusqu’aux feuilles.',
      created: ['BooksRepository', 'BooksService'],
    },
  ]
  if (!second.ok) {
    return [
      ...base,
      {
        title: '4. Résolution du paramètre [1]',
        detail:
          "Nest cherche un provider pour le jeton Object : aucun n'existe. « Nest can't resolve dependencies of the BooksController (BooksService, ?) … argument Object at index [1] ».",
        created: ['BooksRepository', 'BooksService'],
      },
    ]
  }
  return [
    ...base,
    {
      title: '4. Résolution de Clock',
      detail: 'Clock n’a aucune dépendance : il est créé directement.',
      created: ['BooksRepository', 'BooksService', 'Clock'],
    },
    {
      title: '5. new BooksController(booksService, clock)',
      detail: 'Chaque instance est gardée : un autre contrôleur qui demande Clock recevra la même (singleton).',
      created: ['BooksRepository', 'BooksService', 'Clock', 'BooksController'],
    },
  ]
}

export default function DiResolution() {
  const [mode, setMode] = useState<Mode>('import')
  const [index, setIndex] = useState(0)
  const all = steps(mode)
  const step = all[Math.min(index, all.length - 1)]!
  const last = index >= all.length - 1
  const failed = last && !SECOND[mode].ok

  const choose = (m: Mode) => {
    setMode(m)
    setIndex(0)
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['import', 'import { Clock }'],
            ['import-type', 'import type { Clock }'],
            ['interface', 'Clock est une interface'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => choose(m)}
            className={`rounded-md border px-3 py-1 text-sm ${m === mode ? 'border-accent text-text' : 'border-line text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <pre className="overflow-x-auto rounded-md border border-line p-3 font-code text-xs leading-5">
        {`${SECOND[mode].source}

@Controller('books')
export class BooksController {
  constructor(private books: BooksService, private clock: Clock) {}
}`}
      </pre>

      <div className="grid gap-2 rounded-md border border-line p-3">
        <p className="text-sm font-semibold">{step.title}</p>
        <p className={`text-sm ${failed ? 'text-fail' : ''}`}>{step.detail}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {['BooksRepository', 'BooksService', 'Clock', 'BooksController'].map((name) => {
            const created = step.created.includes(name)
            const broken = failed && (name === 'Clock' || name === 'BooksController')
            return (
              <span
                key={name}
                className={`rounded-md border px-2 py-0.5 font-code text-xs ${
                  broken ? 'border-fail text-fail' : created ? 'border-pass text-pass' : 'border-line text-muted'
                }`}
              >
                {name}
                {created ? ' ✓' : broken ? ' ✗' : ''}
              </span>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-md border border-line px-3 py-1 text-sm disabled:opacity-40"
        >
          Précédent
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(all.length - 1, i + 1))}
          disabled={last}
          className="rounded-md border border-line px-3 py-1 text-sm disabled:opacity-40"
        >
          Étape suivante
        </button>
        <span className="text-xs text-muted">
          étape {Math.min(index, all.length - 1) + 1} / {all.length}
        </span>
      </div>
    </div>
  )
}

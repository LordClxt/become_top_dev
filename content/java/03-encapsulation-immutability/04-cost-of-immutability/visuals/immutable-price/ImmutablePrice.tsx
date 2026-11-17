import { useState } from 'react'

export const id = 'java-ch03-immutable-price'

// Modèle exact de deux boucles qui ajoutent un caractère à chaque étape :
//   String s = "";              for (...) s = s + 'x';
//   StringBuilder sb = new …(); for (...) sb.append('x');  puis sb.toString()
// String : chaque étape crée une nouvelle String qui recopie tout (i caractères à l'étape i).
// StringBuilder : capacité initiale 16 ; quand elle déborde, nouveau tableau de 2 * capacité + 2
// qui recopie l'ancien (vérifié dans le JDK 25 : 16 → 34 → 70 → 142 → 286).

const MAX_N = 100
const SHOWN_ROWS = 8

type BuilderState = { capacity: number; buffers: number; copied: number }

function builderAfter(steps: number): BuilderState {
  let capacity = 16
  let buffers = 1
  let copied = 0
  for (let len = 1; len <= steps; len++) {
    if (len > capacity) {
      copied += capacity // Arrays.copyOf recopie l'ancien tableau, plein
      capacity = capacity * 2 + 2
      buffers++
    }
  }
  return { capacity, buffers, copied }
}

function Cells({ filled, total, tone }: { filled: number; total: number; tone: 'fail' | 'pass' | 'muted' }) {
  const color = tone === 'fail' ? 'bg-fail' : tone === 'pass' ? 'bg-pass' : 'bg-muted'
  return (
    <div className="flex flex-wrap gap-[2px]" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2 w-2 rounded-[2px] ${i < filled ? color : 'bg-cell-empty'}`} />
      ))}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'fail' | 'pass' }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className={`font-code text-lg ${tone === 'fail' ? 'text-fail' : tone === 'pass' ? 'text-pass' : ''}`}>{value}</div>
    </div>
  )
}

export default function ImmutablePrice() {
  const [n, setN] = useState(20)
  const [step, setStep] = useState(0)

  const changeN = (v: number) => {
    setN(v)
    setStep((s) => Math.min(s, v))
  }

  const done = step === n
  // Côté String : une String par étape, i caractères recopiés à l'étape i.
  const strings = step
  const stringCopied = (step * (step + 1)) / 2
  // Côté StringBuilder : tampons + recopies, puis toString() copie une fois à la fin.
  const b = builderAfter(step)
  const builderStrings = done ? 1 : 0
  const builderCopied = b.copied + (done ? step : 0)

  const firstRow = Math.max(1, step - SHOWN_ROWS + 1)
  const rows = step === 0 ? [] : Array.from({ length: step - firstRow + 1 }, (_, i) => firstRow + i)
  const hidden = firstRow - 1

  const btn = 'rounded-md border border-line px-3 py-1.5 text-sm hover:border-accent disabled:opacity-40 disabled:hover:border-line'

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="price-n" className="text-sm">
          Nombre d’étapes (caractères ajoutés) : <span className="font-code text-accent">{n}</span>
        </label>
        <input
          id="price-n"
          type="range"
          min={1}
          max={MAX_N}
          value={n}
          onChange={(e) => changeN(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={() => setStep(0)} disabled={step === 0}>
          Recommencer
        </button>
        <button type="button" className={btn} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Étape précédente
        </button>
        <button type="button" className={btn} onClick={() => setStep((s) => Math.min(n, s + 1))} disabled={done}>
          Étape suivante
        </button>
        <button type="button" className={btn} onClick={() => setStep(n)} disabled={done}>
          Aller à la fin
        </button>
        <span className="font-code text-xs text-muted" aria-live="polite">
          étape {step} / {n}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="grid content-start gap-3 rounded-2xl border border-line bg-surface p-4">
          <h4 className="font-code text-sm">s = s + 'x'</h4>
          <div className="grid gap-1.5 min-h-24">
            {hidden > 0 && <div className="text-xs text-muted">… {hidden} String plus courtes, déjà jetées</div>}
            {rows.map((len) => (
              <div key={len} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-right font-code text-[10px] text-muted">{len}</span>
                <Cells filled={len} total={len} tone={len === step ? 'pass' : 'muted'} />
              </div>
            ))}
            {step === 0 && <div className="text-xs text-muted">s = "" (littéral, déjà là)</div>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="String créées" value={strings} tone={strings > 1 ? 'fail' : undefined} />
            <Stat label="caractères recopiés" value={stringCopied} tone={step > 1 ? 'fail' : undefined} />
          </div>
          <p className="text-xs text-muted">
            Chaque étape crée une nouvelle String qui recopie tout ce qui précède. Les lignes grises sont des déchets pour le ramasse-miettes.
          </p>
        </section>

        <section className="grid content-start gap-3 rounded-2xl border border-line bg-surface p-4">
          <h4 className="font-code text-sm">sb.append('x')</h4>
          <div className="grid gap-1.5 min-h-24">
            <div className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-right font-code text-[10px] text-muted">{b.capacity}</span>
              <Cells filled={step} total={b.capacity} tone="pass" />
            </div>
            <div className="text-xs text-muted">
              Un seul StringBuilder ; tampon de {b.capacity} cases, {step} remplies.
              {done && ' toString() copie le contenu une fois dans la String finale.'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="tampons alloués" value={b.buffers} />
            <Stat label="String créées" value={builderStrings} tone={done ? 'pass' : undefined} />
            <Stat label="caractères recopiés" value={builderCopied} tone="pass" />
          </div>
          <p className="text-xs text-muted">
            Le tampon grandit en 2 × capacité + 2 : les recopies restent proportionnelles à la taille finale.
          </p>
        </section>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {done
          ? `Pour ${n} caractères : ${n} String et ${(n * (n + 1)) / 2} caractères recopiés d’un côté, 1 String et ${builderCopied} caractères recopiés de l’autre. Double n : le premier chiffre est environ multiplié par quatre.`
          : 'Avance étape par étape : à gauche, chaque ligne est un objet complet ; à droite, le même tampon se remplit.'}
      </p>
    </div>
  )
}

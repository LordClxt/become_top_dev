import { useState } from 'react'

export const id = 'arch-ch09-federate'

const SERVICES = ['Quoting', 'Item Status', 'Receiving', 'Assessment', 'Accounting', 'Recycling', 'Reporting']
const CUSTOMER = new Set(['Quoting', 'Item Status'])

export default function Federate() {
  const [uiFed, setUiFed] = useState(false)
  const [dbFed, setDbFed] = useState(false)
  // Deux groupes deviennent indépendants seulement si l'interface ET la base sont séparées.
  const quanta = uiFed && dbFed ? 2 : 1
  const groupOf = (s: string) => (quanta === 2 && CUSTOMER.has(s) ? 'border-accent text-accent' : 'border-pass text-pass')
  const btn = (on: boolean, set: (v: boolean) => void, label: string) => (
    <button type="button" onClick={() => set(!on)}
      className={`rounded-md border px-3 py-1 text-sm ${on ? 'border-accent text-text' : 'border-line text-muted'}`}>{on ? '✓ ' : ''}{label}</button>
  )
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {btn(uiFed, setUiFed, 'Fédérer l’interface (clients / opérations)')}
        {btn(dbFed, setDbFed, 'Fédérer la base (externe / interne)')}
      </div>
      <div className="grid gap-1 text-xs text-muted">
        <span>Interface : {uiFed ? 'Customer Facing · Opérations' : 'une seule interface'}</span>
        <span>Base : {dbFed ? 'base clients (zone externe) · base interne' : 'une seule base'}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {SERVICES.map((s) => <span key={s} className={`rounded-md border-2 px-2 py-1 font-code text-xs ${groupOf(s)}`}>{s}</span>)}
      </div>
      <p className="text-sm">Quanta : <span className="font-code text-accent">{quanta}</span>
        <span className="text-muted">{quanta === 1 ? ' — tant que l’interface ou la base est commune, tout reste soudé.' : ' — la partie client a enfin ses propres caractéristiques.'}</span></p>
    </div>
  )
}

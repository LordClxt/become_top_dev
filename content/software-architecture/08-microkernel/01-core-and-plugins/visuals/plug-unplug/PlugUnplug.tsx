import { useState } from 'react'

export const id = 'arch-ch08-plug-unplug'

const DEVICES: Record<string, string> = {
  iPhone6s: 'écran rayé, revendable',
  Galaxy5: 'batterie gonflée, à recycler',
  iPad1: 'verrouillage iCloud actif, bloqué',
  Pixel3: 'bon état, revendable',
  Nokia3310: 'fonctionnel, collector',
}

export default function PlugUnplug() {
  const [plugged, setPlugged] = useState<string[]>(['iPhone6s', 'Galaxy5'])
  const [device, setDevice] = useState('iPhone6s')
  const toggle = (d: string) => setPlugged(plugged.includes(d) ? plugged.filter((x) => x !== d) : [...plugged, d])
  const result = plugged.includes(device) ? DEVICES[device]! : `aucun plug-in pour ${device}`
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {Object.keys(DEVICES).map((d) => (
          <button key={d} type="button" onClick={() => toggle(d)}
            className={`rounded-md border px-3 py-1 font-code text-xs ${plugged.includes(d) ? 'border-pass text-pass' : 'border-line text-muted'}`}>
            {plugged.includes(d) ? '⚡ ' : '○ '}app/plugin/assessment/{d.toLowerCase()}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-line p-3 text-sm">
          <p className="font-semibold">Cœur avec registre</p>
          <p className="font-code text-xs text-muted">registry.get(id)?.assess()</p>
          <p className="mt-2 font-code text-pass">CC = 2, quel que soit le nombre d'appareils</p>
        </div>
        <div className="rounded-md border border-line p-3 text-sm">
          <p className="font-semibold">Cascade de if dans le cœur</p>
          <p className="font-code text-xs text-muted">if (id === 'iPhone6s') … else if …</p>
          <p className="mt-2 font-code text-fail">CC = {plugged.length + 1}, et chaque appareil modifie le cœur</p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        Évaluer :
        <select value={device} onChange={(e) => setDevice(e.target.value)} className="rounded-md border border-line bg-ink px-2 py-1">
          {Object.keys(DEVICES).map((d) => <option key={d}>{d}</option>)}
        </select>
        <span className={`font-code ${plugged.includes(device) ? 'text-pass' : 'text-fail'}`}>{result}</span>
      </label>
    </div>
  )
}

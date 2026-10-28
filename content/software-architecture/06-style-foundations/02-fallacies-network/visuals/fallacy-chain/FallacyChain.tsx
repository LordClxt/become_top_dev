import { useState } from 'react'

export const id = 'arch-ch06-fallacy-chain'

export default function FallacyChain() {
  const [hops, setHops] = useState(5)
  const [latency, setLatency] = useState(60)
  const [loss, setLoss] = useState(1)
  const [payloadKb, setPayloadKb] = useState(300)
  const [rps, setRps] = useState(1500)

  const mean = hops * latency
  const slow = 1 - 0.99 ** hops
  const success = (1 - loss / 100) ** hops
  const bandwidth = (rps * payloadKb) / 1000
  const sliders = [
    ['Services en chaîne', hops, 1, 12, 1, setHops, ''],
    ['Latence moyenne par appel', latency, 5, 300, 5, setLatency, 'ms'],
    ['Appels perdus', loss, 0, 5, 0.5, setLoss, '%'],
    ['Taille de réponse', payloadKb, 1, 500, 1, setPayloadKb, 'Ko'],
    ['Requêtes par seconde', rps, 100, 5000, 100, setRps, ''],
  ] as const
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {sliders.map(([label, v, mn, mx, step, set, unit]) => (
          <label key={label} className="grid gap-1 text-sm">
            <span className="text-muted">{label} : <span className="font-code text-text">{v} {unit}</span></span>
            <input type="range" min={mn} max={mx} step={step} value={v} onChange={(e) => set(Number(e.target.value))} />
          </label>
        ))}
      </div>
      <ul className="grid gap-1 font-code text-sm">
        <li className={mean > 300 ? 'text-fail' : 'text-pass'}>erreur 2 · latence moyenne ajoutée : {mean} ms</li>
        <li className={slow > 0.05 ? 'text-fail' : 'text-pass'}>erreur 2 · pages qui subissent au moins un p99 : {(slow * 100).toFixed(1)} %</li>
        <li className={success < 0.99 ? 'text-fail' : 'text-pass'}>erreur 1 · requêtes réussies sans retry : {(success * 100).toFixed(2)} %</li>
        <li className={bandwidth > 100 ? 'text-fail' : 'text-pass'}>erreur 3 · bande passante : {bandwidth.toFixed(1)} Mo/s</li>
      </ul>
    </div>
  )
}

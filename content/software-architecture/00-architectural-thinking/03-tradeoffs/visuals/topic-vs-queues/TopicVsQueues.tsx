import { useState } from 'react'

export const id = 'arch-ch00-topic-vs-queues'

type Mode = 'topic' | 'queues'
const BASE = ['Bid Capture', 'Bid Tracking', 'Bid Analytics']

export default function TopicVsQueues() {
  const [mode, setMode] = useState<Mode>('topic')
  const [history, setHistory] = useState(false)
  const [spy, setSpy] = useState(false)
  const [askingPrice, setAskingPrice] = useState(false)

  const consumers = [...BASE, ...(history ? ['Bid History'] : [])]
  const topic = mode === 'topic'
  const producerConnections = topic ? 1 : consumers.length
  const producerChanged = !topic && history
  const contractTouched = askingPrice ? (topic ? consumers.length : 1) : 0
  // Sur une file, l'espion lit la file de Bid Analytics : il vole un message sur deux.
  const received = (c: string) => (spy && !topic && c === 'Bid Analytics' ? 50 : 100)

  const toggle = (on: boolean, set: (v: boolean) => void, label: string) => (
    <button type="button" onClick={() => set(!on)}
      className={`rounded-md border px-3 py-1 text-sm ${on ? 'border-accent text-text' : 'border-line text-muted'}`}>
      {on ? '✓ ' : ''}{label}
    </button>
  )

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {(['topic', 'queues'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`rounded-md border px-3 py-1 text-sm ${m === mode ? 'border-accent text-text' : 'border-line text-muted'}`}>
            {m === 'topic' ? 'Un topic (pub/sub)' : 'Une file par consommateur'}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {toggle(history, setHistory, 'Ajouter Bid History')}
        {toggle(spy, setSpy, 'Brancher un espion')}
        {toggle(askingPrice, setAskingPrice, 'History veut aussi le prix demandé')}
      </div>
      <div className="grid gap-2 rounded-md border border-line p-3 text-sm">
        <p className="font-semibold">Bid Producer → {topic ? '1 topic' : `${producerConnections} files`}</p>
        <div className="flex flex-wrap gap-2">
          {consumers.map((c) => (
            <span key={c} className={`rounded-md border px-2 py-0.5 font-code text-xs ${received(c) < 100 ? 'border-fail text-fail' : 'border-pass text-pass'}`}>
              {c} : {received(c)} % des offres
            </span>
          ))}
          {spy && (
            <span className={`rounded-md border px-2 py-0.5 font-code text-xs ${topic ? 'border-fail text-fail' : 'border-pass text-pass'}`}>
              espion : {topic ? '100 % des offres, sans que personne ne le voie' : 'vole des offres → perte détectée, alerte'}
            </span>
          )}
        </div>
      </div>
      <ul className="grid gap-1 text-sm">
        <li className={producerChanged ? 'text-fail' : 'text-muted'}>
          Modifier le producteur : {producerChanged ? 'oui, il faut ajouter une file' : 'non'}
        </li>
        {askingPrice && (
          <li className={topic ? 'text-fail' : 'text-pass'}>
            Contrats à changer : {contractTouched} ({topic ? 'contrat unique pour tous les abonnés' : 'seul le canal de History change'})
          </li>
        )}
        <li className="text-muted">
          Montée en charge par consommateur : {topic ? 'difficile (pas de profondeur de file par consommateur)' : 'oui, selon la profondeur de chaque file'}
        </li>
      </ul>
    </div>
  )
}

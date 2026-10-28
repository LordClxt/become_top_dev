import { useState } from 'react'

export const id = 'arch-ch10-broker-vs-mediator'

type Topo = 'broker' | 'mediator'
type Row = { who: string; state: 'ok' | 'fail' | 'idle' | 'stuck'; note: string }

function run(topo: Topo, crash: boolean, resumed: boolean): { rows: Row[]; verdict: string; ok: boolean } {
  const pay: Row = crash && !resumed ? { who: 'Payment', state: 'fail', note: 'plantage' } : { who: 'Payment', state: 'ok', note: 'payé' }
  if (topo === 'broker') {
    return {
      rows: [
        { who: 'OrderPlacement', state: 'ok', note: 'order-created publié' },
        { who: 'Inventory', state: 'ok', note: 'stock décrémenté' },
        { who: 'Notification', state: 'ok', note: 'e-mail envoyé' },
        pay,
        { who: 'OrderFulfillment', state: crash ? 'stuck' : 'ok', note: crash ? 'attend payment-applied… pour toujours' : 'préparée' },
      ],
      verdict: crash ? 'Personne ne sait que la commande est bloquée ; le stock est déjà décrémenté.' : 'Rapide et découplé.',
      ok: !crash,
    }
  }
  const stopped = crash && !resumed
  return {
    rows: [
      { who: 'Étape 1 · create-order', state: 'ok', note: 'acquitté' },
      { who: 'Étape 2 · email, inventory', state: 'ok', note: 'acquittés' },
      { ...pay, who: 'Étape 2 · payment' },
      { who: 'Étape 3 · fulfill', state: stopped ? 'idle' : 'ok', note: stopped ? 'pas commencée' : resumed ? 'reprise ici' : 'faite' },
      { who: 'État du médiateur', state: stopped ? 'stuck' : 'ok', note: stopped ? 'arrêté à l’étape 2, persisté' : 'terminé, état supprimé' },
    ],
    verdict: stopped ? 'Le médiateur sait où il en est : il reprendra à l’étape 2 sans refaire le reste.' : 'Contrôle complet, au prix de la performance.',
    ok: !stopped,
  }
}

export default function BrokerVsMediator() {
  const [topo, setTopo] = useState<Topo>('broker')
  const [crash, setCrash] = useState(true)
  const [resumed, setResumed] = useState(false)
  const { rows, verdict, ok } = run(topo, crash, resumed)
  const cls = { ok: 'border-pass text-pass', fail: 'border-fail text-fail', stuck: 'border-fail text-fail', idle: 'border-line text-muted' }
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {(['broker', 'mediator'] as const).map((t) => (
          <button key={t} type="button" onClick={() => { setTopo(t); setResumed(false) }}
            className={`rounded-md border px-3 py-1 text-sm ${t === topo ? 'border-accent text-text' : 'border-line text-muted'}`}>{t === 'broker' ? 'Broker' : 'Médiateur'}</button>
        ))}
        <button type="button" onClick={() => { setCrash(!crash); setResumed(false) }}
          className={`rounded-md border px-3 py-1 text-sm ${crash ? 'border-fail text-fail' : 'border-line text-muted'}`}>{crash ? '✓ ' : ''}Payment plante</button>
        {topo === 'mediator' && crash && (
          <button type="button" onClick={() => setResumed(true)} disabled={resumed}
            className="rounded-md border border-line px-3 py-1 text-sm disabled:opacity-40">Carte mise à jour : reprendre</button>
        )}
      </div>
      <div className="grid gap-1">
        {rows.map((r) => (
          <div key={r.who} className={`flex justify-between rounded-md border px-3 py-1 font-code text-xs ${cls[r.state]}`}>
            <span>{r.who}</span><span>{r.note}</span>
          </div>
        ))}
      </div>
      <p className={`text-sm ${ok ? 'text-pass' : 'text-fail'}`}>{verdict}</p>
    </div>
  )
}

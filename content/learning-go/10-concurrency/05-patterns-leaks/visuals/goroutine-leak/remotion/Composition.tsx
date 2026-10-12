import { Chip, ease, Panel, type SceneFrame, Text, TraceScene } from '../../../../_shared/trace'
import { live, PROGRAM, type State, STEPS } from './sim'

export function Composition() {
  return (
    <TraceScene steps={STEPS} program={PROGRAM}>
      {(f) => <Stage {...f} />}
    </TraceScene>
  )
}

function Stage({ step, prev, t, w }: SceneFrame<State>) {
  const s = step.state
  const known = new Set((prev?.gs ?? []).map((g) => g.id))
  const n = live(s)
  const leaked = s.gs.filter((g) => g.state === 'blocked').length
  return (
    <>
      <Panel x={0} y={0} w={w} h={120} title="runtime.NumGoroutine()" />
      <Text x={w - 190} y={30} size={64} mono weight={700} tone={n > 1 ? 'fail' : 'pass'}>
        {n}
      </Text>
      <Chip x={24} y={56} w={120} h={50} label="main" tone="accent" />
      {s.gs.map((g, i) => {
        const fresh = !known.has(g.id)
        const x = 170 + i * 118
        return (
          <Chip
            key={g.id}
            x={x}
            y={56}
            w={108}
            h={50}
            label={g.id}
            tone={g.state === 'blocked' ? 'fail' : g.state === 'exited' ? 'ghost' : 'plain'}
            dashed={g.state !== 'running'}
            opacity={fresh ? ease(t) : g.state === 'exited' ? 0.5 : 1}
            scale={fresh ? 0.8 + 0.2 * t : 1}
          />
        )
      })}
      <Panel x={0} y={160} w={w} h={250} title="état des producteurs" />
      {s.gs.length === 0 && <Text x={24} y={230} size={20}>aucun producteur lancé</Text>}
      {s.gs.map((g, i) => (
        <div key={g.id}>
          <Text x={28} y={218 + i * 40} size={20} mono tone="text">
            {g.id}
          </Text>
          <Text x={170} y={218 + i * 40} size={20} weight={600} tone={g.state === 'blocked' ? 'fail' : g.state === 'exited' ? 'pass' : 'accent'}>
            {g.state === 'blocked' ? 'bloqué sur ch <- v pour toujours' : g.state === 'exited' ? 'terminé proprement' : 'envoie des valeurs'}
          </Text>
        </div>
      ))}
      {leaked > 0 && (
        <Text x={0} y={426} size={24} weight={600} tone="fail">
          {leaked} goroutine{leaked > 1 ? 's' : ''} fuitée{leaked > 1 ? 's' : ''}
        </Text>
      )}
      {s.note && <Text x={w - 200} y={426} size={22} mono tone="accent" w={200} align="right">{s.note}</Text>}
    </>
  )
}

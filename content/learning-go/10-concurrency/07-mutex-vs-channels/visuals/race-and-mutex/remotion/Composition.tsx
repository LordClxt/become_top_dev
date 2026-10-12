import { Chip, lerp, Panel, type SceneFrame, Text, TraceScene } from '../../../../_shared/trace'
import { PROGRAM, type State, STEPS } from './sim'

export function Composition() {
  return (
    <TraceScene steps={STEPS} program={PROGRAM}>
      {(f) => <Stage {...f} />}
    </TraceScene>
  )
}

const label = { idle: 'pas démarrée', read: 'a lu', wrote: 'a écrit', blocked: 'attend le verrou', locked: 'a le verrou' } as const

function Stage({ step, prev, t, w }: SceneFrame<State>) {
  const s = step.state
  const from = prev ?? s
  const counter = Math.round(lerp(from.counter, s.counter, t))
  const bad = s.counter === 1 && s.gs[0].status === 'wrote' && s.gs[1].status === 'wrote' && !s.mutex
  const good = s.counter === 2 && s.mutex
  const GW = 220
  return (
    <>
      {s.gs.map((gr, i) => {
        const x = i === 0 ? 0 : w - GW
        return (
          <div key={i}>
            <Panel x={x} y={0} w={GW} h={250} title={`G${i + 1}`} active={gr.status === 'read' || gr.status === 'locked' || gr.status === 'wrote'} />
            <Text x={x + 20} y={60} size={20} weight={600} tone={gr.status === 'blocked' ? 'fail' : 'text'}>
              {label[gr.status]}
            </Text>
            {gr.reg !== null && (
              <>
                <Text x={x + 20} y={110} size={18}>
                  registre local
                </Text>
                <Chip x={x + 20} y={140} w={90} h={60} label={String(gr.reg)} tone="plain" />
              </>
            )}
          </div>
        )
      })}
      <Panel x={w / 2 - 110} y={20} w={220} h={170} title="counter" active={false} />
      <Text x={w / 2 - 50} y={76} size={84} mono weight={700} tone={bad ? 'fail' : good ? 'pass' : 'text'}>
        {counter}
      </Text>
      <Text x={w / 2 - 110} y={210} size={22} tone={bad ? 'fail' : good ? 'pass' : 'muted'} weight={600} w={220} align="center">
        {bad ? 'attendu : 2 — perdu !' : good ? 'attendu : 2 ✓' : 'attendu à la fin : 2'}
      </Text>
      {s.mutex && (
        <>
          <Panel x={w / 2 - 110} y={290} w={220} h={90} title="mu" note={s.holder === null ? 'libre' : `tenu par G${s.holder + 1}`} active={s.holder !== null} />
        </>
      )}
    </>
  )
}

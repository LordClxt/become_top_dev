import { Chip, ease, Panel, type SceneFrame, Text, TraceScene } from '../../../../_shared/trace'
import { PROGRAM, type State, STEPS } from './sim'

export function Composition() {
  return (
    <TraceScene steps={STEPS} program={PROGRAM}>
      {(f) => <Stage {...f} />}
    </TraceScene>
  )
}

function Stage({ step, prev, t, w }: SceneFrame<State>) {
  const s = step.state
  const before = new Set(prev?.out ?? [])
  const WX = 200
  const OX = w - 200
  return (
    <>
      <Panel x={0} y={0} w={170} h={456} title="in" note="jobs" />
      {s.queue.map((j, i) => (
        <Chip key={j} x={52} y={64 + i * 62} w={66} h={50} label={String(j)} tone="plain" />
      ))}
      {s.workers.map((wk, i) => (
        <div key={i}>
          <Panel x={WX} y={20 + i * 150} w={200} h={130} title={`worker ${i + 1}`} active={wk.job !== null} />
          {wk.job !== null ? (
            <>
              <Chip x={WX + 22} y={72 + i * 150} w={66} h={52} label={String(wk.job)} tone="accent" />
              <Text x={WX + 100} y={88 + i * 150} size={17} mono>
                reste {wk.left}
              </Text>
            </>
          ) : (
            <Text x={WX + 24} y={84 + i * 150} size={20}>
              libre
            </Text>
          )}
        </div>
      ))}
      <Panel x={OX} y={0} w={200} h={456} title="out" note={s.closed ? '(fermé)' : ''} dashed={s.closed} active={s.out.length > 0 && !s.closed} />
      {s.out.map((j, i) => {
        const fresh = !before.has(j)
        return <Chip key={j} x={OX + 24 + (i % 2) * 84} y={64 + Math.floor(i / 2) * 70} w={66} h={54} label={String(j)} tone="pass" opacity={fresh ? ease(t) : 1} scale={fresh ? 0.8 + 0.2 * t : 1} />
      })}
    </>
  )
}

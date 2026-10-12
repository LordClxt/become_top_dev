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
  return (
    <>
      <Panel x={0} y={0} w={170} h={120} title="WaitGroup" active={s.wg === 0} />
      <Text x={60} y={50} size={56} mono weight={700} tone={s.wg === 0 ? 'pass' : 'text'}>
        {s.wg}
      </Text>
      {s.ws.map((g, i) => (
        <div key={g.id}>
          <Chip x={0} y={150 + i * 76} w={120} h={58} label={`worker ${g.id}`} tone={g.status === 'done' ? 'ghost' : 'accent'} />
          <Text x={140} y={166 + i * 76} size={20} tone={g.status === 'done' ? 'pass' : 'accent'}>
            {g.status === 'done' ? 'Done()' : 'travaille'}
          </Text>
        </div>
      ))}
      <Panel x={w - 340} y={0} w={340} h={120} title="moniteur" note="wg.Wait(); close(out)" active={s.closed} />
      <Text x={w - 320} y={64} size={22} weight={600} tone={s.closed ? 'pass' : 'fail'}>
        {s.closed ? 'out fermé' : 'attend le compteur'}
      </Text>
      <Panel x={w - 340} y={150} w={340} h={140} title="out" note={s.closed ? '(fermé)' : '(ouvert)'} dashed={s.closed} />
      {s.out.map((v, i) => {
        const fresh = !before.has(v)
        return <Chip key={v} x={w - 320 + i * 74} y={206} w={62} h={56} label={v} tone="accent" opacity={fresh ? ease(t) : 1} scale={fresh ? 0.8 + 0.2 * t : 1} />
      })}
      <Panel x={w - 340} y={320} w={340} h={110} title="for v := range out" active={!s.ranEnded && s.out.length > 0} />
      <Text x={w - 320} y={376} size={22} weight={600} tone={s.ranEnded ? 'pass' : 'muted'}>
        {s.ranEnded ? 'boucle terminée' : s.closed && s.out.length > 0 ? 'lit puis voit la fermeture' : 'attend des valeurs'}
      </Text>
    </>
  )
}

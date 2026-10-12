import { Chip, ease, Panel, type SceneFrame, Slot, Text, TraceScene } from '../../../../_shared/trace'
import { LIMIT, PROGRAM, type Req, type State, STEPS } from './sim'

export function Composition() {
  return (
    <TraceScene steps={STEPS} program={PROGRAM}>
      {(f) => <Stage {...f} />}
    </TraceScene>
  )
}

const tone = (r: Req) => (r.status === 'refused' ? 'fail' : r.status === 'done' ? 'ghost' : 'accent')
const text = (r: Req) => (r.status === 'refused' ? '429 refusée' : r.status === 'done' ? 'terminée' : 'en cours')

function Stage({ step, prev, t, w }: SceneFrame<State>) {
  const s = step.state
  const known = new Set((prev?.reqs ?? []).map((r) => r.id))
  return (
    <>
      <Panel x={0} y={0} w={w} h={150} title="tickets" note={`chan struct{} (cap ${LIMIT})`} active={s.tokens === 0} />
      {Array.from({ length: LIMIT }, (_, i) => (
        <Slot key={i} x={24 + i * 84} y={64} w={72} h={64} />
      ))}
      {Array.from({ length: LIMIT - s.tokens }, (_, i) => (
        <Chip key={i} x={24 + i * 84} y={64} w={72} h={64} label="jeton" tone="accent" />
      ))}
      <Text x={260} y={92} size={22} tone={s.tokens === 0 ? 'fail' : 'pass'} weight={600}>
        {s.tokens === 0 ? 'plus de jeton libre' : `${s.tokens} jeton${s.tokens > 1 ? 's' : ''} libre${s.tokens > 1 ? 's' : ''}`}
      </Text>
      <Text x={0} y={190} size={20}>
        requêtes
      </Text>
      {s.reqs.map((r, i) => {
        const fresh = !known.has(r.id)
        return (
          <div key={r.id}>
            <Chip x={0} y={214 + i * 62} w={150} h={50} label={`requête ${r.id}`} tone={tone(r)} dashed={r.status === 'refused'} opacity={fresh ? ease(t) : 1} scale={fresh ? 0.85 + 0.15 * t : 1} />
            <Text x={176} y={226 + i * 62} size={22} weight={600} tone={r.status === 'refused' ? 'fail' : r.status === 'done' ? 'muted' : 'accent'}>
              {text(r)}
            </Text>
          </div>
        )
      })}
    </>
  )
}

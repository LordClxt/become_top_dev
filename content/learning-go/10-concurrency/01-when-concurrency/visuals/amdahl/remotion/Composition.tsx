import { lerp, Panel, type SceneFrame, Text, TraceScene } from '../../../../_shared/trace'
import { PROGRAM, type State, STEPS } from './sim'

const BAR_W = 660
const BAR_H = 96

export function Composition() {
  return (
    <TraceScene steps={STEPS} program={PROGRAM}>
      {(f) => <Stage {...f} />}
    </TraceScene>
  )
}

const fmt = (x: number) => x.toFixed(2).replace('.', ',')

function Stage({ step, prev, t }: SceneFrame<State>) {
  const cur = step.state
  const from = prev ?? cur
  const serial = lerp(from.serial, cur.serial, t)
  const parallel = lerp(from.parallel, cur.parallel, t)
  const speedup = lerp(from.speedup, cur.speedup, t)
  const cores = cur.n >= 1e6 ? '∞' : String(cur.n)

  return (
    <>
      <Text x={0} y={0} size={26} tone="text" weight={600}>
        {cores} cœur{cur.n > 1 ? 's' : ''}
      </Text>
      <Text x={0} y={70} size={18}>
        temps d’exécution (référence = 1 cœur)
      </Text>
      <Panel x={0} y={104} w={BAR_W + 24} h={BAR_H + 24} />
      <div style={{ position: 'absolute', left: 12, top: 116, width: BAR_W, height: BAR_H, display: 'flex' }}>
        <div style={{ width: BAR_W * serial, background: 'var(--fail)', borderRadius: '12px 0 0 12px' }} />
        <div style={{ width: BAR_W * parallel, background: 'var(--accent)', borderRadius: cur.n >= 1e6 ? 0 : '0 12px 12px 0' }} />
      </div>
      <Text x={0} y={240} size={20} tone="fail">
        ■ séquentiel : {fmt(serial)}
      </Text>
      <Text x={260} y={240} size={20} tone="accent">
        ■ parallèle : {fmt(parallel)}
      </Text>
      <Text x={0} y={330} size={20}>
        gain de vitesse
      </Text>
      <Text x={0} y={362} size={64} tone="text" weight={700} mono>
        ×{fmt(speedup)}
      </Text>
      <Text x={330} y={392} size={20}>
        plafond ×4,00
      </Text>
    </>
  )
}

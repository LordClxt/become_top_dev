import { Chip, Panel, type SceneFrame, Text, TraceScene } from '../../../../_shared/trace'
import { PROGRAM, type State, STEPS } from './sim'

export function Composition() {
  return (
    <TraceScene steps={STEPS} program={PROGRAM}>
      {(f) => <Stage {...f} />}
    </TraceScene>
  )
}

function Chan({ x, name, ready, chosen }: { x: number; name: string; ready: boolean; chosen: boolean }) {
  return (
    <>
      <Panel x={x} y={40} w={200} h={130} title={name} active={chosen} dashed={!ready} />
      {ready ? <Chip x={x + 70} y={100} w={60} h={50} label="v" tone={chosen ? 'accent' : 'plain'} /> : <Text x={x + 28} y={106} size={18}>vide</Text>}
    </>
  )
}

function Tally({ x, label, n, tone }: { x: number; label: string; n: number; tone: 'accent' | 'text' }) {
  return (
    <>
      <Text x={x} y={330} size={20} mono tone={tone}>
        {label}
      </Text>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x + i * 34,
            top: 366,
            width: 26,
            height: 26,
            borderRadius: 6,
            background: i < n ? (tone === 'accent' ? 'var(--accent)' : 'var(--text-muted)') : 'var(--cell-empty)',
          }}
        />
      ))}
    </>
  )
}

function Stage({ step, w }: SceneFrame<State>) {
  const s = step.state
  return (
    <>
      <Chan x={0} name="ch1" ready={s.ready1} chosen={s.last === '1'} />
      <Chan x={w - 200} name="ch2" ready={s.ready2} chosen={s.last === '2'} />
      <Panel x={w / 2 - 110} y={210} w={220} h={90} title="select" active={s.last !== null && !s.blocked} />
      <Text x={w / 2 - 90} y={254} size={22} tone={s.blocked ? 'fail' : s.last === 'default' ? 'pass' : 'text'} weight={600}>
        {s.blocked ? 'bloqué : en attente' : s.last === 'default' ? 'branche default' : s.last ? `exécute ch${s.last}` : 'choisit…'}
      </Text>
      <Tally x={40} label={`ch1 servi : ${s.n1}`} n={s.n1} tone="accent" />
      <Tally x={w - 260} label={`ch2 servi : ${s.n2}`} n={s.n2} tone="text" />
    </>
  )
}

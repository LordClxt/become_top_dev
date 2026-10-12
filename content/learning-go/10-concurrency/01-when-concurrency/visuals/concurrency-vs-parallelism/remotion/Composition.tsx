import { Chip, ease, Panel, type SceneFrame, Slot, Text, TraceScene } from '../../../../_shared/trace'
import { PROGRAM, type State, STEPS } from './sim'

const CELL_W = 76
const CELL_H = 76
const GAP = 8
const X0 = 130

export function Composition() {
  return (
    <TraceScene steps={STEPS} program={PROGRAM}>
      {(f) => <Stage {...f} />}
    </TraceScene>
  )
}

function Stage({ step, prev, t }: SceneFrame<State>) {
  const s = step.state
  const known = new Set((prev?.cells ?? []).map((c) => `${c.core}.${c.tick}`))
  const ticks = s.cores === 1 ? 6 : 3
  const rowY = (core: number) => 110 + core * (CELL_H + 40)
  const total = s.cells.length === 0 ? 0 : Math.max(...s.cells.map((c) => c.tick)) + 1

  return (
    <>
      <Text x={0} y={0} size={26} tone="text" weight={600}>
        {s.cores === 1 ? '1 cœur' : '2 cœurs'}
      </Text>
      <Text x={0} y={36} size={18}>
        temps →
      </Text>
      {Array.from({ length: s.cores }, (_, core) => (
        <div key={core}>
          <Panel x={0} y={rowY(core) - 14} w={X0 + ticks * (CELL_W + GAP) + 6} h={CELL_H + 28} />
          <Text x={20} y={rowY(core) + 22} size={22} mono tone="text">
            cœur {core + 1}
          </Text>
          {Array.from({ length: ticks }, (_, i) => (
            <Slot key={i} x={X0 + i * (CELL_W + GAP)} y={rowY(core)} w={CELL_W} h={CELL_H} />
          ))}
        </div>
      ))}
      {s.cells.map((c) => {
        const fresh = !known.has(`${c.core}.${c.tick}`)
        return (
          <Chip
            key={`${c.core}.${c.tick}`}
            x={X0 + c.tick * (CELL_W + GAP)}
            y={rowY(c.core)}
            w={CELL_W}
            h={CELL_H}
            label={`${c.task}${c.n}`}
            tone={c.task === 'A' ? 'accent' : 'plain'}
            opacity={fresh ? ease(t) : 1}
            scale={fresh ? 0.8 + 0.2 * t : 1}
          />
        )
      })}
      <Text x={0} y={rowY(s.cores - 1) + CELL_H + 40} size={24} tone={total === (s.cores === 1 ? 6 : 3) ? 'pass' : 'muted'} weight={600}>
        {total > 0 ? `temps écoulé : ${total} unité${total > 1 ? 's' : ''}` : 'temps écoulé : 0'}
      </Text>
    </>
  )
}

import { ease, Panel, type SceneFrame, Text, TraceScene } from '../../../../_shared/trace'
import { PROGRAM, ROWS, type State, STEPS, type Verdict } from './sim'

const ROW_H = 74
const NAME_W = 170
const COL_W = 168
const GAP = 8

export function Composition() {
  return (
    <TraceScene steps={STEPS} program={PROGRAM}>
      {(f) => <Stage {...f} />}
    </TraceScene>
  )
}

const color: Record<Verdict, string> = { wait: 'var(--fail)', ok: 'var(--pass)', panic: 'var(--c-red)' }

function Stage({ step, prev, t }: SceneFrame<State>) {
  const shown = step.state.rows
  const before = prev?.rows ?? 0
  const heads = ['lire', 'écrire', 'fermer']
  return (
    <>
      {heads.map((h, i) => (
        <Text key={h} x={NAME_W + 24 + i * (COL_W + GAP)} y={0} size={22} tone="text" mono weight={600}>
          {h}
        </Text>
      ))}
      {ROWS.map((row, r) => {
        const visible = r < shown
        const fresh = r === shown - 1 && shown > before
        const op = visible ? (fresh ? ease(t) : 1) : 0.12
        const y = 40 + r * (ROW_H + GAP)
        return (
          <div key={row.name}>
            <Panel x={0} y={y} w={NAME_W} h={ROW_H} active={r === shown - 1} />
            <Text x={14} y={y + 22} size={19} tone="text" weight={600} opacity={op} w={NAME_W - 24}>
              {row.name}
            </Text>
            {([row.read, row.write, row.close] as const).map((c, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: NAME_W + 10 + i * (COL_W + GAP),
                  top: y,
                  width: COL_W,
                  height: ROW_H,
                  border: `2px solid ${visible ? color[c.verdict] : 'var(--line)'}`,
                  borderRadius: 16,
                  display: 'grid',
                  placeItems: 'center',
                  padding: 8,
                  textAlign: 'center',
                  fontSize: 17,
                  lineHeight: 1.15,
                  fontWeight: c.verdict === 'panic' ? 700 : 500,
                  color: visible ? color[c.verdict] : 'var(--text-muted)',
                  opacity: op,
                  background: 'var(--ink)',
                }}
              >
                {visible ? c.text : '?'}
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}

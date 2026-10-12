import { Chip, ease, Panel, type SceneFrame, Slot, Text, TraceScene } from '../../../../_shared/trace'
import { CAP, PROGRAM, type State, STEPS } from './sim'

const SLOT_W = 76
const SLOT_GAP = 14
const BX = 190
const BY = 150

export function Composition() {
  return (
    <TraceScene steps={STEPS} program={PROGRAM}>
      {(f) => <Stage {...f} />}
    </TraceScene>
  )
}

function Stage({ step, prev, t, w }: SceneFrame<State>) {
  const s = step.state
  const slotX = (i: number) => BX + 24 + i * (SLOT_W + SLOT_GAP)
  const before = new Set(prev?.buf ?? [])
  const full = s.buf.length === CAP
  return (
    <>
      <Panel x={0} y={100} w={150} h={150} title="producteur" active={s.waiting === null && !s.closed} />
      <Text x={20} y={150} size={20} tone={s.waiting !== null ? 'fail' : 'muted'} weight={600}>
        {s.waiting !== null ? 'bloqué' : s.closed ? 'terminé' : 'envoie'}
      </Text>
      {s.waiting !== null && <Chip x={40} y={180} w={70} h={52} label={String(s.waiting)} tone="fail" dashed />}

      <Panel x={BX} y={BY - 50} w={CAP * (SLOT_W + SLOT_GAP) + 34} h={150} title="chan int" note={`len ${s.buf.length} / cap ${CAP}`} active={full} />
      {Array.from({ length: CAP }, (_, i) => (
        <Slot key={i} x={slotX(i)} y={BY + 10} w={SLOT_W} h={64} />
      ))}
      {s.buf.map((v, i) => {
        const fresh = !before.has(v)
        return <Chip key={v} x={slotX(i)} y={BY + 10} w={SLOT_W} h={64} label={String(v)} tone="accent" opacity={fresh ? ease(t) : 1} scale={fresh ? 0.8 + 0.2 * t : 1} />
      })}
      {s.closed && <Text x={BX + 24} y={BY + 106} size={20} tone="fail" weight={600}>fermé</Text>}

      <Panel x={w - 170} y={100} w={170} h={290} title="consommateur" />
      {s.got.map((v, i) => (
        <Chip key={v} x={w - 150 + (i % 2) * 74} y={150 + Math.floor(i / 2) * 70} w={64} h={56} label={String(v)} tone="pass" />
      ))}
      <Text x={w - 150} y={360} size={18}>
        lu : {s.got.length}
      </Text>
    </>
  )
}

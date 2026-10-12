import { Chip, lerp, Panel, type SceneFrame, Text, TraceScene } from '../../../../_shared/trace'
import { PROGRAM, type State, STEPS, type Status, type Where } from './sim'

const PW = 210
const PH = 260
const PY = 70

export function Composition() {
  return (
    <TraceScene steps={STEPS} program={PROGRAM}>
      {(f) => <Stage {...f} />}
    </TraceScene>
  )
}

const label: Record<Status, string> = { idle: 'pas encore là', run: 'exécute', blocked: 'bloquée', done: 'terminée' }
const xOf = (w: Where, stageW: number) => (w === 'receiver' ? stageW - PW + 70 : w === 'sender' ? 70 : (stageW - 64) / 2)

function Gor({ x, title, status }: { x: number; title: string; status: Status }) {
  return (
    <>
      <Panel x={x} y={PY} w={PW} h={PH} title={title} active={status === 'run'} dashed={status === 'idle'} />
      <Text x={x + 20} y={PY + 60} size={22} tone={status === 'blocked' ? 'fail' : status === 'run' ? 'accent' : 'muted'} weight={600}>
        {label[status]}
      </Text>
    </>
  )
}

function Stage({ step, prev, t, w }: SceneFrame<State>) {
  const cur = step.state
  const from = prev ?? cur
  const x0 = xOf(from.value, w)
  const x1 = xOf(cur.value, w)
  const visible = cur.value !== 'none' || from.value !== 'none'
  return (
    <>
      <Gor x={0} title="émetteur" status={cur.sender} />
      <Gor x={w - PW} title="récepteur" status={cur.receiver} />
      <Panel x={PW + 40} y={PY + 80} w={w - 2 * PW - 80} h={100} title="chan int  (cap 0)" dashed />
      <Text x={PW + 60} y={PY + 130} size={18}>
        aucune place
      </Text>
      {visible && <Chip x={lerp(x0, x1, t)} y={PY + 175} w={90} h={56} label="42" tone={cur.got ? 'accent' : 'plain'} glow={t < 1 && from.value !== cur.value} />}
      {cur.got && cur.receiver === 'run' && <Text x={w - PW + 20} y={PY + 110} size={22} mono tone="pass">v = 42</Text>}
    </>
  )
}

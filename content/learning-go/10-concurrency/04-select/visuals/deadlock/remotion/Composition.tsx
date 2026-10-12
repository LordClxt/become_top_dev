import { Panel, type SceneFrame, Text, TraceScene } from '../../../../_shared/trace'
import { PROGRAM, type State, STEPS } from './sim'

export function Composition() {
  return (
    <TraceScene steps={STEPS} program={PROGRAM}>
      {(f) => <Stage {...f} />}
    </TraceScene>
  )
}

function Stage({ step, w }: SceneFrame<State>) {
  const { gs, fatal } = step.state
  const gw = Math.min(230, (w - 40 * (gs.length - 1)) / gs.length)
  return (
    <>
      {gs.map((g, i) => {
        const x = i * (gw + 40)
        return (
          <div key={g.name}>
            <Panel x={x} y={20} w={gw} h={190} title={g.name} active={g.status === 'run'} />
            <Text x={x + 20} y={80} size={24} weight={600} tone={g.status === 'blocked' ? 'fail' : 'accent'}>
              {g.status === 'blocked' ? 'endormie' : 'exécute'}
            </Text>
            {g.waits && (
              <Text x={x + 20} y={124} size={19} mono>
                {g.waits}
              </Text>
            )}
          </div>
        )
      })}
      <Panel x={0} y={260} w={w} h={200} title="sortie du programme" dashed={!fatal} active={false} />
      <Text x={24} y={330} size={22} mono tone={fatal ? 'fail' : 'muted'} weight={fatal ? 700 : 400}>
        {fatal ? 'fatal error: all goroutines are asleep - deadlock!' : '…'}
      </Text>
      {fatal && (
        <Text x={24} y={376} size={19} mono>
          exit status 2
        </Text>
      )}
    </>
  )
}

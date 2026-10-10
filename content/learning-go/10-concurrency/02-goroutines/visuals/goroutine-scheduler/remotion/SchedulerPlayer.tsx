import { Player } from '@remotion/player'
import { DURATION, FPS, SchedulerComposition } from './SchedulerComposition'

export default function SchedulerPlayer() {
  return (
    <Player
      component={SchedulerComposition}
      durationInFrames={DURATION}
      fps={FPS}
      compositionWidth={1280}
      compositionHeight={720}
      controls
      clickToPlay
      style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}
    />
  )
}

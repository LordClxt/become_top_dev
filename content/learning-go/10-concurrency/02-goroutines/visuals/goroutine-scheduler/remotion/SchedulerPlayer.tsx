import { Player } from '@remotion/player'
import { useAutoplay } from '../../../../_shared/trace'
import { DURATION, FPS, SchedulerComposition } from './SchedulerComposition'

export default function SchedulerPlayer() {
  const { ref, box } = useAutoplay()
  return (
    <div ref={box}>
      <Player
        ref={ref}
        component={SchedulerComposition}
        durationInFrames={DURATION}
        fps={FPS}
        compositionWidth={1280}
        compositionHeight={800}
        controls
        showVolumeControls={false}
        clickToPlay
        style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}
      />
    </div>
  )
}

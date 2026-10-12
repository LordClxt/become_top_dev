import { TracePlayer } from '../../../../_shared/trace'
import { Composition } from './Composition'
import { STEPS } from './sim'

export default function Video() {
  return <TracePlayer component={Composition} steps={STEPS.length} />
}

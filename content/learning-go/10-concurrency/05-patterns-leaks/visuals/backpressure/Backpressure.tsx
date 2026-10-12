import { makeVisual } from '../../../_shared/makeVisual'
import { STEPS } from './remotion/sim'

export const id = 'go-ch10-backpressure'

export default makeVisual(STEPS, () => import('./remotion/Video'))

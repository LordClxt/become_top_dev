import { makeVisual } from '../../../_shared/makeVisual'
import { STEPS } from './remotion/sim'

export const id = 'go-ch10-waitgroup-close-monitor'

export default makeVisual(STEPS, () => import('./remotion/Video'))

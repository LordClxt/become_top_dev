import { withLocalGsap } from '@/visuals/registry'
import coder from './scenes/coder.html?raw'
import hero from './scenes/hero.html?raw'
import lire from './scenes/lire.html?raw'
import valider from './scenes/valider.html?raw'

/** Illustrations HyperFrames de la page d'accueil (GSAP embarqué : aucune dépendance au CDN). */
export const scenes = {
  hero: withLocalGsap(hero),
  lire: withLocalGsap(lire),
  coder: withLocalGsap(coder),
  valider: withLocalGsap(valider),
}

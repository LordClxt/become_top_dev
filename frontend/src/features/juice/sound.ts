import { getSettings } from '@/lib/settings'

/**
 * Petit synthétiseur WebAudio : aucun fichier audio, des carillons doux (sinus + harmonique triangle, enveloppe courte).
 * L'AudioContext n'est créé qu'au premier geste de l'utilisateur ; aucune fonction ne lève d'exception.
 */

export type SoundName = 'correct' | 'wrong' | 'xp' | 'complete' | 'levelup' | 'flip' | 'combo' | 'bell'

/** Mode concentration : seuls les sons du minuteur de séance (`bell`) passent. */
let quiet = false
export function setQuiet(on: boolean) {
  quiet = on
}

type Ctx = { ctx: AudioContext; out: GainNode }
let audio: Ctx | null = null
let unlockInstalled = false

function ensure(): Ctx | null {
  if (typeof window === 'undefined') return null
  if (audio) return audio
  try {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    const ctx = new AC()
    // Chaîne : voix -> filtre passe-bas (adoucit les attaques) -> volume général.
    const out = ctx.createGain()
    out.gain.value = 0.22
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 4200
    out.connect(lp).connect(ctx.destination)
    audio = { ctx, out }
  } catch {
    audio = null
  }
  return audio
}

/** À appeler une fois côté client : débloque l'audio au premier clic/touche (règle d'autoplay des navigateurs). */
export function installSoundUnlock() {
  if (unlockInstalled || typeof window === 'undefined') return
  unlockInstalled = true
  const unlock = () => {
    const a = ensure()
    if (a && a.ctx.state === 'suspended') a.ctx.resume().catch(() => {})
    window.removeEventListener('pointerdown', unlock, true)
    window.removeEventListener('keydown', unlock, true)
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('keydown', unlock, true)
}

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

/** Une note : attaque rapide, décroissance exponentielle. `at` en secondes depuis maintenant. */
function note(a: Ctx, freq: number, at: number, dur: number, vol = 1, type: OscillatorType = 'sine') {
  const { ctx, out } = a
  const t = ctx.currentTime + at
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  g.connect(out)
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.connect(g)
  // Harmonique douce une octave au-dessus : donne le timbre « clochette ».
  const o2 = ctx.createOscillator()
  const g2 = ctx.createGain()
  o2.type = 'triangle'
  o2.frequency.setValueAtTime(freq * 2, t)
  g2.gain.value = 0.18
  o2.connect(g2).connect(g)
  o.start(t)
  o2.start(t)
  o.stop(t + dur + 0.05)
  o2.stop(t + dur + 0.05)
}

/** Souffle filtré (retournement de carte). */
function whoosh(a: Ctx) {
  const { ctx, out } = a
  const len = Math.floor(ctx.sampleRate * 0.18)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 0.9
  const t = ctx.currentTime
  bp.frequency.setValueAtTime(700, t)
  bp.frequency.exponentialRampToValueAtTime(2400, t + 0.16)
  const g = ctx.createGain()
  g.gain.value = 0.35
  src.connect(bp).connect(g).connect(out)
  src.start(t)
}

/**
 * Joue un son si le réglage « Sons » est actif. `combo` : rang du combo (2, 3, …) qui fait monter la hauteur.
 */
export function play(name: SoundName, opts: { combo?: number } = {}) {
  try {
    if (!getSettings().sound || (quiet && name !== 'bell')) return
    const a = ensure()
    if (!a) return
    if (a.ctx.state === 'suspended') a.ctx.resume().catch(() => {})
    switch (name) {
      case 'correct': // quinte montante do -> sol
        note(a, midi(72), 0, 0.35, 0.8)
        note(a, midi(79), 0.08, 0.5, 0.7)
        break
      case 'wrong': // tierce descendante, grave et feutrée : pas une sanction
        note(a, midi(64), 0, 0.3, 0.45)
        note(a, midi(60), 0.1, 0.42, 0.4)
        break
      case 'xp': // petite étincelle aiguë
        note(a, midi(84), 0, 0.22, 0.45)
        note(a, midi(91), 0.05, 0.3, 0.35)
        break
      case 'combo': {
        // Gamme pentatonique : chaque combo monte d'un degré, plafonné.
        const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]
        const k = Math.min(steps.length - 1, Math.max(0, (opts.combo ?? 2) - 2))
        const base = 74 + (steps[k] ?? 0)
        note(a, midi(base), 0, 0.3, 0.7)
        note(a, midi(base + 7), 0.07, 0.42, 0.55)
        break
      }
      case 'complete': // arpège majeur do-mi-sol-do
        ;[72, 76, 79, 84].forEach((n, i) => note(a, midi(n), i * 0.09, 0.6, 0.65))
        break
      case 'levelup': // arpège plus ample, puis accord tenu
        ;[67, 72, 76, 79, 84].forEach((n, i) => note(a, midi(n), i * 0.08, 0.5, 0.55))
        ;[72, 76, 79, 88].forEach((n) => note(a, midi(n), 0.45, 1.3, 0.35))
        break
      case 'flip':
        whoosh(a)
        break
      case 'bell': // fin de phase du minuteur : deux notes longues et douces
        note(a, midi(69), 0, 1.6, 0.32)
        note(a, midi(76), 0.28, 1.9, 0.26)
        break
    }
  } catch {
    // l'audio ne doit jamais casser l'interface
  }
}

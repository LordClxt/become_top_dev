import type { CSSProperties } from 'react'

/** Zone de quadrillage avec sa lueur cyan, posée derrière le contenu (statique, décorative). */
export function GridZone({
  style,
  size = 520,
  glow = { x: 0.15, y: 0.1 },
}: {
  /** Position dans le parent `relative` (top/left/right/bottom). */
  style: CSSProperties
  size?: number
  /** Décalage de la lueur, en fraction de `size`, pour qu'elle déborde de la grille. */
  glow?: { x: number; y: number }
}) {
  return (
    <div
      className="pointer-events-none absolute -z-10"
      style={{ ...style, width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className="glow-cyan absolute rounded-full"
        style={{
          width: size * 0.6,
          height: size * 0.6,
          left: size * (0.2 + glow.x),
          top: size * (0.2 + glow.y),
        }}
      />
      <div className="bg-grid absolute inset-0" />
    </div>
  )
}

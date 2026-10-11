---
name: concept-visual
description: Design and produce an illustration for a hard concept (event loop, goroutines, scheduler, call stack, networking, architecture styles…) by choosing the right format — Remotion video, interactive HTML/SVG/canvas animation or static diagram. Use it for a lesson's pre-generated visuals and to design on-demand generation from the AI coach.
---

# concept-visual

## 1. Choose the format (and justify it in one line in `visual.yaml`)
| Question | Format |
|---|---|
| Is the concept a linear sequence you only need to watch (a request crosses the network, a call pushes frames)? | `remotion` |
| A linear **mini-illustration** of 8–15 s (a command, a flow, a chain of steps) that needs no React state? | `hyperframes` |
| Must the user **manipulate** a parameter to understand (task delays, number of workers, channel buffer size)? | `interactive` |
| Is a fixed structure enough (architecture layers, memory layout of a slice)? | `static` |

When in doubt, prefer `interactive`: understanding by manipulating > watching.

## 2. Produce
- **Rule**: a diagram is never written as text in a lesson (ASCII, box-drawing, arrows in a code block). As soon as a concept can be drawn (architecture, request flow, memory, slice header, curve), produce a visual; with no other need for interaction, `hyperframes` is the default choice.
- **The visual must be faithful to the real mechanism** (order of events, intermediate states). Simulate the logic in a small pure model (a `step(state) → state` function), then animate the trace — never a hand-made animation that could lie.
- `remotion`: React composition in `visuals/<id>/`, 10–30 s, 30 fps, steps annotated in French, played through `@remotion/player`.
- `hyperframes`: standalone `visuals/<id>/scene.html` (`hyperframes-animation` skill): `<meta name="visual-id">`, root with `data-composition-id` / `data-duration` / `data-width=1920` / `data-height=1080`, **one** paused GSAP timeline on `window.__timelines`, state = pure function of time. App color tokens copied in, with `html.light` for the light theme (the player syncs the class). Text ≥ 30 px (the scene is scaled down to ~40 %). The GSAP CDN `<script>` is replaced with the npm copy at build time. Check a few key moments in screenshots (both themes) before delivering.
- `interactive`: standalone React component (props = `visual.yaml` `params`), SVG preferred, canvas if > ~200 animated elements. Controls: shadcn sliders/buttons, step button + play + reset.
- `static`: SVG (or Mermaid for architecture diagrams), readable in dark and light themes.

## 3. Style (shared design system)
- Use only the `design-system/` tokens (semantic colors, typography, transition durations/easings). No hard-coded colors.
- Restrained animations: one thing moves at a time, gentle easing, 200–600 ms per transition.
- Captions and annotations in French, code identifiers in English.

## 4. On demand (AI coach)
The coach generates a `visual.yaml` + an `interactive` or `static` component constrained to the same design system, from the context of the current lesson. Remotion videos are not generated on demand in the MVP (rendering cost) — to be reassessed in v2.

## Definition of Done
- [ ] Complete `visual.yaml` with a one-line `justification`
- [ ] Faithful mechanism (state model tested if non-trivial)
- [ ] Renders correctly in dark and light themes
- [ ] Referenced in `lesson.md` via `::visual{id="…"}`

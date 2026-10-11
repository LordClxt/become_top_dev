---
name: frontend-ui
description: Conventions for all work in frontend/ — TanStack Start, React, shadcn/ui, Tailwind, premium editorial dark/light design, reuse of complex components from registries (shadcn, Origin UI, Magic UI, Aceternity, Kibo UI…). Use it to create pages, components, the built-in IDE, dashboard, lesson reader or Remotion integration.
---

# frontend-ui

## Stack
- TanStack Start (file routing, loaders, server functions) + TanStack Query for calls to the FastAPI API.
- shadcn/ui + Tailwind v4. Icons: lucide-react. Animations: `motion` (restrained).
- Code editor: Monaco (`@monaco-editor/react`) or CodeMirror 6 — decided at step 2. Terminal: xterm.js.
- Visuals: `@remotion/player` + interactive components from `visuals/`.

## Reuse before coding
Before any complex component (sidebar, command palette, data table, charts, file tree, timeline, streak heatmap, kanban, stepper…):
1. Search the registries, in this order: shadcn/ui (blocks + charts) → Kibo UI / Origin UI → Magic UI / Aceternity (effects, use sparingly).
2. Install through the CLI: `npx shadcn@latest add <url-or-name>` to keep the code in the repo.
3. Adapt to the design system tokens; remove unnecessary effects.
4. Credit the source in a comment at the top of the file.

## Design (high bar)
- For any new page, visual redesign or creation of `design-system/`: load the `frontend-design` skill first (aesthetic direction, typography), then apply the conventions below.
- Dark by default, full light theme. CSS tokens in `design-system/` shared with the visuals.
- Editorial reading: 65–75 character text column, a polished serif or sans for body text, mono for code, clear typographic hierarchy, plenty of whitespace.
- Restrained animations (≤ 300 ms for UI, respect `prefers-reduced-motion`).
- Desktop-first (≥ 1280 px), usable at 1024 px.
- UI text in French; code, component names and routes in English.

## Structure
```
frontend/src/
  routes/              # TanStack Start file routes
  components/ui/       # shadcn (generated)
  components/<feature>/
  features/<feature>/  # hooks, api, state per feature (lesson, lab, quiz, xp, coach, dashboard)
  lib/
```

## Definition of Done
- [ ] Tested in dark and light themes
- [ ] No hard-coded colors/durations (tokens only)
- [ ] Empty / loading / error states handled
- [ ] `pnpm typecheck && pnpm lint` pass

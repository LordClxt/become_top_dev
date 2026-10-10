---
name: frontend-ui
description: Conventions pour tout travail dans frontend/ — TanStack Start, React, shadcn/ui, Tailwind, design premium éditorial sombre/clair, réutilisation de composants complexes depuis les registres (shadcn, Origin UI, Magic UI, Aceternity, Kibo UI…). À utiliser pour créer pages, composants, IDE intégré, dashboard, lecteur de leçon ou intégration Remotion.
---

# frontend-ui

## Stack
- TanStack Start (routing fichier, loaders, server functions) + TanStack Query pour les appels à l'API FastAPI.
- shadcn/ui + Tailwind v4. Icônes : lucide-react. Animations : `motion` (sobres).
- Éditeur de code : Monaco (`@monaco-editor/react`) ou CodeMirror 6 — décision à l'étape 2. Terminal : xterm.js.
- Visuels : `@remotion/player` + composants interactifs de `visuals/`.

## Réutiliser avant de coder
Avant tout composant complexe (sidebar, command palette, data table, charts, file tree, timeline, heatmap de streak, kanban, stepper…) :
1. Chercher dans les registres, dans cet ordre : shadcn/ui (blocks + charts) → Kibo UI / Origin UI → Magic UI / Aceternity (effets, à doser).
2. Installer via le CLI : `npx shadcn@latest add <url-ou-nom>` pour garder le code dans le repo.
3. Adapter aux tokens du design system ; supprimer les effets superflus.
4. Mentionner la source en commentaire en tête de fichier.

## Design (exigence forte)
- Pour toute nouvelle page, refonte visuelle ou création de `design-system/` : charger d'abord le skill `frontend-design` (direction esthétique, typo), puis appliquer les conventions ci-dessous.
- Sombre par défaut, thème clair complet. Tokens CSS dans `design-system/` partagés avec les visuels.
- Lecture éditoriale : colonne de texte 65–75 caractères, serif ou sans soignée pour le corps, mono pour le code, hiérarchie typographique nette, beaucoup d'espace.
- Animations sobres (≤ 300 ms UI, respect de `prefers-reduced-motion`).
- Desktop-first (≥ 1280 px), utilisable à 1024 px.
- Texte UI en français ; code, noms de composants et routes en anglais.

## Structure
```
frontend/src/
  routes/              # TanStack Start file routes
  components/ui/       # shadcn (généré)
  components/<feature>/
  features/<feature>/  # hooks, api, state par feature (lesson, lab, quiz, xp, coach, dashboard)
  lib/
```

## Definition of Done
- [ ] Testé en thème sombre et clair
- [ ] Aucune couleur/durée en dur (tokens uniquement)
- [ ] États vide / chargement / erreur gérés
- [ ] `pnpm typecheck && pnpm lint` passent

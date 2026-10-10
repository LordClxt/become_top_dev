---
name: concept-visual
description: Concevoir et produire un visuel d'illustration pour un concept difficile (event loop, goroutines, scheduler, pile d'exécution, réseau, styles d'architecture…) en choisissant le bon format — vidéo Remotion, animation interactive HTML/SVG/canvas ou schéma statique. À utiliser pour les visuels pré-générés d'une leçon et pour concevoir la génération à la demande depuis le coach IA.
---

# concept-visual

## 1. Choisir le format (et le justifier en une ligne dans `visual.yaml`)
| Question | Format |
|---|---|
| Le concept est un déroulé linéaire qu'il suffit de regarder (une requête traverse le réseau, un appel empile des frames) ? | `remotion` |
| Une **mini-illustration** linéaire de 8–15 s (une commande, un flux, un enchaînement d'étapes) qui n'a pas besoin d'état React ? | `hyperframes` |
| L'utilisateur doit **manipuler** un paramètre pour comprendre (délais de tâches, nombre de workers, taille de buffer d'un channel) ? | `interactive` |
| Une structure fixe suffit (layers d'une archi, layout mémoire d'une slice) ? | `static` |

En cas de doute, préférer `interactive` : comprendre en manipulant > regarder.

## 2. Produire
- **Le visuel doit être fidèle au mécanisme réel** (ordre des événements, états intermédiaires). Simuler la logique dans un petit modèle pur (fonction `step(state) → state`) puis animer la trace — jamais d'animation « à la main » qui pourrait mentir.
- `remotion` : composition React dans `visuals/<id>/`, 10–30 s, 30 fps, étapes annotées en français, lue via `@remotion/player`.
- `hyperframes` : `visuals/<id>/scene.html` autonome (skill `hyperframes-animation`) : `<meta name="visual-id">`, racine `data-composition-id` / `data-duration` / `data-width=1920` / `data-height=1080`, **une** timeline GSAP en pause sur `window.__timelines`, état = fonction pure du temps. Tokens de couleur de l'app recopiés, avec `html.light` pour le thème clair (le lecteur synchronise la classe). Texte ≥ 30 px (la scène est réduite à ~40 %). Le `<script>` GSAP du CDN est remplacé par la copie npm au build. Vérifier quelques instants clés en capture (deux thèmes) avant de livrer.
- `interactive` : composant React autonome (props = `params` de `visual.yaml`), SVG de préférence, canvas si > ~200 éléments animés. Contrôles : sliders/boutons shadcn, bouton pas-à-pas + lecture + reset.
- `static` : SVG (ou Mermaid pour les diagrammes d'archi), lisible en thème sombre et clair.

## 3. Style (design system partagé)
- Utiliser exclusivement les tokens de `design-system/` (couleurs sémantiques, typo, durées/easings de transition). Pas de couleurs en dur.
- Animations sobres : une chose bouge à la fois, easing doux, 200–600 ms par transition.
- Légendes et annotations en français, identifiants de code en anglais.

## 4. À la demande (coach IA)
Le coach génère un `visual.yaml` + un composant `interactive` ou `static` contraint au même design system, à partir du contexte de la leçon en cours. Les vidéos Remotion ne sont pas générées à la demande dans le MVP (coût de rendu) — à réévaluer en v2.

## Definition of Done
- [ ] `visual.yaml` complet avec `justification` en une ligne
- [ ] Mécanisme fidèle (modèle d'état testé si non trivial)
- [ ] Rendu correct en thème sombre et clair
- [ ] Référencé dans `lesson.md` via `::visual{id="…"}`

---
name: content-format
description: Format de référence des fichiers de cours dans content/ (Markdown + YAML) — arborescence, IDs, schémas des leçons, TP, devoirs, quiz, flashcards, projets et visuels. À consulter avant toute création, modification ou lecture de contenu de cours, et pour le loader backend.
---

# content-format

> Statut : **provisoire** jusqu'à validation de l'étape 1. Toute modification du format se fait ici d'abord, puis dans le loader backend.

## Arborescence
```
content/<book>/
  course.yaml                          # parcours, ordre des chapitres, métadonnées livre
  <NN>-<chapter-slug>/
    chapter.yaml                       # objectifs, seuil de maîtrise, boss fight
    <NN>-<lesson-slug>/
      lesson.md                        # front-matter YAML + corps Markdown (FR)
      quiz.yaml
      flashcards.yaml
      labs/<lab-slug>/
        lab.yaml
        instructions.md
        hints.md                       # 3 niveaux, séparés par "## Hint 1/2/3"
        starter/                       # code donné à l'utilisateur
        solution/                      # solution de référence
        tests/                         # tests exécutés en sandbox
        mutants/                       # kind: tests — versions buguées que les tests de l'apprenant doivent faire échouer
      visuals/<concept-slug>/
        visual.yaml
        ...                            # composition Remotion, composant interactif ou SVG
    assignment/                        # devoir du chapitre
      assignment.yaml  instructions.md  rubric.yaml  starter/  solution/  tests/
    project/                           # projet de fin de chapitre
      project.yaml  milestones.yaml  starter/
    boss/                              # boss fight = lab chronométré, même format que labs/
```

## Règles
- `NN` = ordre sur 2 chiffres. Le slug peut changer, **l'`id` jamais** (clé de progression en DB).
- Format d'ID : `<book-short>-ch<NN>-l<NN>[-<suffix>]`, ex. `go-ch02-l03`, `go-ch02-l03-lab-iota`, `arch-ch09-assignment`.
- Tout texte destiné à l'utilisateur est en français ; clés YAML, code et noms de fichiers en anglais.
- Chaque leçon cite `source.chapter` et `source.pages`.
- Code dans le Markdown : blocs fencés avec langage (` ```go `).
- Visuels inline dans une leçon : directive `::visual{id="go-ch10-goroutine-scheduler"}`.
- Pas de schéma en texte (ASCII/box-drawing) dans le Markdown : utiliser un visuel (`hyperframes` par défaut pour un flux ou une structure de 8–15 s, voir `concept-visual`) et lister son id dans `visuals:` de la leçon.

## Schémas
Voir [reference/schemas.md](reference/schemas.md) pour chaque fichier YAML/front-matter avec exemple complet.

## Definition of Done
- [ ] Tous les fichiers respectent les schémas (champs requis présents, IDs uniques)
- [ ] Chaque `lab.yaml` / `assignment.yaml` pointe vers des dossiers existants
- [ ] Les `::visual{id}` référencent des visuels existants

# Schémas de contenu

Champs marqués `# requis` obligatoires ; les autres optionnels.

## course.yaml
```yaml
id: go                                  # requis — préfixe des IDs
title: "Go idiomatique"                 # requis
book:
  title: "Learning Go, 2nd Edition"
  authors: ["Jon Bodner"]
  slug: learning-go                     # = .cache/books/<slug>
summary: "Le langage, de la première…"   # requis — 1-2 phrases, affiché sur l'accueil et le tableau de bord
order: 1                                # position dans le catalogue (défaut 100)
kind: practical                         # requis — practical | conceptual
language: go                            # runner sandbox (absent si aucun TP codé)
running_project: { id: go-relay, title: "Relay — …", pitch: "…" }   # fil rouge (optionnel)
requires:                               # pré-requis souples entre cours (conseil, jamais bloquant)
  - { course: go, through: "10-concurrency", reason: "Les TP utilisent goroutines et channels." }
planned_titles: { "03-blocks-control": "Blocs, portée et contrôle" }   # modules pas encore générés
tracks:                                 # requis
  - id: go-foundations
    title: "Fondations"
    chapters: ["01-setup", "02-types"]  # noms de dossiers
```

## chapter.yaml
```yaml
id: go-ch02                             # requis
title: "Types prédéclarés et déclarations"  # requis
source: { chapter: 2, pages: "17-38" }  # requis
objectives:                             # requis — « être capable de… »
  - "Choisir entre var, := et const selon le contexte"
mastery_threshold: 0.8                  # requis — score min. pour débloquer la suite
prerequisites: [go-ch01]
lessons: ["01-zero-values", "02-constants"]   # ordre
xp: { assignment: 150, project: 300, boss: 250 }
```

## lesson.md (front-matter)
```markdown
---
id: go-ch02-l02                         # requis
title: "Constantes et iota"             # requis
source: { chapter: 2, pages: "30-34" }  # requis
duration_min: 20
concepts:                               # requis — alimente le dashboard maîtrisé/fragile
  - id: go-const-untyped
    label: "Constantes non typées"
glossary:
  - term: "iota"
    definition: "Compteur auto-incrémenté dans un bloc const."
visuals: [go-ch02-iota-counter]
labs: [go-ch02-l02-lab-enum]
extra: false                            # true = contenu au-delà du livre
xp: 30                                  # lecture complétée
---

## Pourquoi c'est important
...
## Le concept
...
## Pièges fréquents
...
## À retenir
- ...
```

## lab.yaml
```yaml
id: go-ch02-l02-lab-enum                # requis
title: "Énumération avec iota"          # requis
kind: code                              # requis — code | tests (l'apprenant écrit les tests) | design (conceptuel)
checks: [race, goroutine-leak]          # optionnel — contrôles en plus des tests (`-race`, fuite de goroutines)
language: go                            # requis si kind=code
difficulty: 2                           # 1-5
xp: 50                                  # requis
timeout_s: 10
entrypoint: starter/                    # requis
test_command: "go test ./..."           # requis si kind=code
files_editable: ["enum.go"]             # fichiers modifiables dans l'IDE
concepts: [go-const-untyped]            # requis
verified: { at: 2026-10-10, solution: pass, starter: fail }  # écrit après verify_lab.sh
```

## assignment.yaml + rubric.yaml
```yaml
# assignment.yaml
id: go-ch02-assignment
title: "..."
kind: code                              # code | design
xp: 150
test_command: "go test ./..."
```
```yaml
# rubric.yaml — utilisée par la revue IA (et seule notation si kind=design)
criteria:
  - id: correctness
    label: "Correction"
    weight: 0.4
    source: tests                       # tests | ai
  - id: readability
    label: "Lisibilité et nommage idiomatique"
    weight: 0.2
    source: ai
    levels:
      4: "Noms idiomatiques, fonctions courtes, zéro duplication"
      2: "Lisible mais noms génériques ou duplication"
      0: "Difficile à suivre"
```

## quiz.yaml
```yaml
id: go-ch02-l02-quiz
questions:
  - id: q1
    type: single                        # single | multiple | code-output | order | free
    prompt: "Que vaut `C` ?"
    code: |
      const (A = iota; B; C)
    choices: ["0", "1", "2", "3"]
    answer: 2                           # index (single), liste (multiple), texte (code-output)
    explanation: "iota commence à 0 et s'incrémente à chaque ligne du bloc."
    concept: go-const-untyped
    difficulty: 1
```

## flashcards.yaml
```yaml
cards:
  - id: fc1
    front: "Que vaut iota sur la première ligne d'un bloc const ?"
    back: "0"
    concept: go-const-untyped
```

## project.yaml + milestones.yaml
```yaml
# project.yaml — mêmes champs d'exécution qu'un lab (starter/, solution/, tests/ à côté)
id: go-ch02-project
title: "..."
pitch: "Une phrase qui donne envie."
running_project: go-relay      # optionnel — projet fil rouge
kind: code
language: go
xp: 300
test_command: "go test ./..."
files_editable: ["jobs.go"]
```
```yaml
# milestones.yaml
milestones:
  - id: m1
    title: "..."
    goal: "..."
    tests: "go test ./... -run TestM1"
    review: true                        # revue de code IA à ce jalon
```

## visual.yaml
```yaml
id: go-ch10-goroutine-scheduler         # requis
concept: go-goroutines                  # requis
format: interactive                     # requis — remotion | interactive | static | hyperframes
justification: "L'utilisateur doit changer le nombre de P et de goroutines pour voir la répartition."  # requis, 1 ligne
entry: Scheduler.tsx                    # composition Remotion, composant React, .svg ou scene.html (hyperframes)
duration_s: 20                          # remotion et hyperframes
params:                                 # interactive uniquement — contrôles exposés
  - { name: goroutines, type: int, min: 1, max: 12, default: 4 }
status: idea                            # idea | built
```

## Exercice `diagram` (kata de diagramme, éditeur de nœuds)
Même dossier qu'un TP (`lab.yaml`, `starter/`, `solution/`, `tests/`), mais rien n'est exécuté : le backend vérifie un graphe.
```yaml
# lab.yaml
id: arch-sandbox-ggg-bid-flow
title: "Going, Going, Gone : le soir de clôture"
kind: diagram
difficulty: 3
xp: 120
entrypoint: starter/
files_editable: ["diagram.json"]          # obligatoire et unique
concepts: []                              # concepts d'une leçon du cours, si l'exercice est rattaché
source: { chapter: 18, pages: "295-297" }
palette:                                  # blocs disponibles ; shape = client|service|queue|database|external|cache
  - { type: bid-tracker, label: "Bid Tracker", shape: service, hint: "Ordonne toutes les offres." }
verified: { at: 2026-10-10, solution: pass, starter: fail }  # écrit après verify_lab.sh
```
`starter/diagram.json` et `solution/diagram.json` : `{"nodes": [{"id", "type", "x", "y"}], "edges": [{"id", "source", "target"}]}`.
Une flèche va dans le sens où circulent les données ; une flèche qui touche un bloc `queue` est asynchrone.

`tests/checks.yaml` : règles (types de la palette uniquement), libellés en français, affichés à l'apprenant.
```yaml
checks:
  - { id: bidder-path, label: "...", rule: path, source: bidder, target: bid-tracker, via: bid-capture }
  - { id: tracker-buffered, label: "...", rule: inbound_via, target: bid-tracker, via: queue }
  - { id: capture-stateless, label: "...", rule: no_edge, source: bid-capture, target: database }
  - { id: single-owner, label: "...", rule: single_owner, target: database }
  - { id: connected, label: "...", rule: connected }
```
`path` (avec `via` : tous les chemins y passent) · `no_edge` · `inbound_via` · `single_owner` · `connected`.

## Atelier : `content/<livre>/sandbox/<slug>/`
Exercices hors module (affichés dans « Atelier »), au même format qu'un TP ou un `diagram`. Ils rapportent de l'XP mais ne comptent pas dans la maîtrise d'un module.

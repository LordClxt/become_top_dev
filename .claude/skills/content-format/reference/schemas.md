# Content schemas

Fields marked `# required` are mandatory; all others are optional.
Example values stay in French: they show real user-facing content.

## course.yaml
```yaml
id: go                                  # required — ID prefix
title: "Go idiomatique"                 # required
book:
  title: "Learning Go, 2nd Edition"
  authors: ["Jon Bodner"]
  slug: learning-go                     # = .cache/books/<slug>
summary: "Le langage, de la première…"   # required — 1-2 sentences, shown on the home page and dashboard
order: 1                                # position in the catalog (default 100)
kind: practical                         # required — practical | conceptual
language: go                            # sandbox runner (absent if there are no coding labs)
running_project: { id: go-relay, title: "Relay — …", pitch: "…" }   # common-thread project (optional)
requires:                               # soft prerequisites between courses (advice, never blocking)
  - { course: go, through: "10-concurrency", reason: "Les TP utilisent goroutines et channels." }
planned_titles: { "03-blocks-control": "Blocs, portée et contrôle" }   # modules not generated yet
tracks:                                 # required
  - id: go-foundations
    title: "Fondations"
    chapters: ["01-setup", "02-types"]  # folder names
```

## chapter.yaml
```yaml
id: go-ch02                             # required
title: "Types prédéclarés et déclarations"  # required
source: { chapter: 2, pages: "17-38" }  # required
objectives:                             # required — "be able to…"
  - "Choisir entre var, := et const selon le contexte"
mastery_threshold: 0.8                  # required — minimum score to unlock what follows
prerequisites: [go-ch01]
lessons: ["01-zero-values", "02-constants"]   # order
xp: { assignment: 150, project: 300, boss: 250 }
```

## lesson.md (front matter)
```markdown
---
id: go-ch02-l02                         # required
title: "Constantes et iota"             # required
source: { chapter: 2, pages: "30-34" }  # required
duration_min: 20
concepts:                               # required — feeds the mastered/shaky dashboard
  - id: go-const-untyped
    label: "Constantes non typées"
glossary:
  - term: "iota"
    definition: "Compteur auto-incrémenté dans un bloc const."
visuals: [go-ch02-iota-counter]
labs: [go-ch02-l02-lab-enum]
extra: false                            # true = content beyond the book
xp: 30                                  # lesson read to the end
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
id: go-ch02-l02-lab-enum                # required
title: "Énumération avec iota"          # required
kind: code                              # required — code | tests (the learner writes the tests) | design (conceptual)
checks: [race, goroutine-leak]          # optional — checks on top of the tests (`-race`, goroutine leaks)
language: go                            # required if kind=code
difficulty: 2                           # 1-5
xp: 50                                  # required
timeout_s: 10
entrypoint: starter/                    # required
test_command: "go test ./..."           # required if kind=code
files_editable: ["enum.go"]             # files editable in the IDE
concepts: [go-const-untyped]            # required
verified: { at: 2026-10-10, solution: pass, starter: fail }  # written after verify_lab.sh
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
# rubric.yaml — used by the AI review (and the only grading if kind=design)
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
    answer: 2                           # index (single), list (multiple), text (code-output)
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
# project.yaml — same execution fields as a lab (starter/, solution/, tests/ alongside)
id: go-ch02-project
title: "..."
pitch: "Une phrase qui donne envie."
running_project: go-relay      # optional — common-thread project
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
    review: true                        # AI code review at this milestone
```

## visual.yaml
```yaml
id: go-ch10-goroutine-scheduler         # required
concept: go-goroutines                  # required
format: interactive                     # required — remotion | interactive | static | hyperframes
justification: "L'utilisateur doit changer le nombre de P et de goroutines pour voir la répartition."  # required, 1 line
entry: Scheduler.tsx                    # Remotion composition, React component, .svg or scene.html (hyperframes)
duration_s: 20                          # remotion and hyperframes
params:                                 # interactive only — exposed controls
  - { name: goroutines, type: int, min: 1, max: 12, default: 4 }
status: idea                            # idea | built
```

## `diagram` exercise (diagram kata, node editor)
Same folder as a lab (`lab.yaml`, `starter/`, `solution/`, `tests/`), but nothing is run: the backend checks a graph.
```yaml
# lab.yaml
id: arch-sandbox-ggg-bid-flow
title: "Going, Going, Gone : le soir de clôture"
kind: diagram
difficulty: 3
xp: 120
entrypoint: starter/
files_editable: ["diagram.json"]          # required, and the only entry
concepts: []                              # concepts from a course lesson, if the exercise is attached to one
source: { chapter: 18, pages: "295-297" }
palette:                                  # available blocks; shape = client|service|queue|database|external|cache
  - { type: bid-tracker, label: "Bid Tracker", shape: service, hint: "Ordonne toutes les offres." }
verified: { at: 2026-10-10, solution: pass, starter: fail }  # written after verify_lab.sh
```
`starter/diagram.json` and `solution/diagram.json`: `{"nodes": [{"id", "type", "x", "y"}], "edges": [{"id", "source", "target"}]}`.
An arrow points in the direction data flows; an arrow touching a `queue` block is asynchronous.

`tests/checks.yaml`: rules (palette types only), labels in French, shown to the learner.
```yaml
checks:
  - { id: bidder-path, label: "...", rule: path, source: bidder, target: bid-tracker, via: bid-capture }
  - { id: tracker-buffered, label: "...", rule: inbound_via, target: bid-tracker, via: queue }
  - { id: capture-stateless, label: "...", rule: no_edge, source: bid-capture, target: database }
  - { id: single-owner, label: "...", rule: single_owner, target: database }
  - { id: connected, label: "...", rule: connected }
```
`path` (with `via`: every path goes through it) · `no_edge` · `inbound_via` · `single_owner` · `connected`.

## Workshop: `content/<book>/sandbox/<slug>/`
Exercises outside any module (shown under "Atelier"), in the same format as a lab or a `diagram`. They award XP but do not count toward a module's mastery.

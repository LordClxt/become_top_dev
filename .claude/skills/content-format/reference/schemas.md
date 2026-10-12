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
books:                                  # optional — extra books when the course is built on several
  - { title: "…", authors: ["…"], slug: groovy-in-action }
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
source: { chapter: 2, pages: "17-38" }  # required — add `book: <slug>` if the course has several books
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
kind: code                              # required — code | tests (the learner writes the tests) | diagram | worksheet (see below)
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

## `diagram` exercise (architecture diagram, node editor)
Same folder as a lab (`lab.yaml`, `starter/`, `solution/`, `tests/`), but nothing is run: the backend checks a graph.
```yaml
# lab.yaml
id: ddia-ch02-l01-lab-bitcask-design
title: "Dessine le moteur Bitcask"
kind: diagram
difficulty: 3
xp: 80
entrypoint: starter/
files_editable: ["diagram.json"]          # required, and the only entry
concepts: [ddia-hash-index]
source: { chapter: 3, pages: "72-75" }
palette:                                  # available blocks
  - { type: hash, component: hash-index, label: "Index de hachage", hint: "Table clé → offset." }
  - { type: active, component: log, label: "Segment actif", hint: "Le seul fichier où l'on écrit." }
verified: { at: 2026-10-10, solution: pass, starter: fail }  # written after verify_lab.sh
```
`component` names a **catalog** component (`backend/internal/content/catalog.yaml`, served by `/api/diagram/catalog`) that fixes the icon, color family and properties: browser, CDN, load balancer, API gateway, service, worker, PostgreSQL, MySQL, MongoDB, Cassandra, Redis, Memcached, queue, Kafka, object storage, WAL, memtable, SSTable, B-tree page, leader, replica, graph entity, zone… The old `shape` (client|service|queue|database|external|cache) is still accepted. Several palette blocks can share a component (`type` tells them apart in the rules).

`diagram.json` (v2; v1 is still read):
```json
{"nodes": [{"id": "n1", "type": "hash", "x": 0, "y": 0, "label": "Index", "parent": "zone1", "props": {"role": "cache"}, "w": 380, "h": 250}],
 "edges": [{"id": "e1", "source": "n1", "target": "n2", "kind": "read", "label": "Get"}]}
```
Arrow `kind`: `sync` (call) · `async` · `read` · `write` · `replication`. `parent` places a block inside a zone; `w`/`h` only apply to zones; `props` follows the component's properties (e.g. Redis: `role: cache`, B-tree page: `keys: "10 20"`).

`tests/checks.yaml`: rules (palette types), labels in French shown to the learner. Faulty blocks or arrows are highlighted after "Vérifier".
| Rule | Fields | Checks |
|---|---|---|
| `path` | source, target, via? | a path exists (with `via`: every path goes through it) |
| `no_edge` | source, target | no direct arrow |
| `inbound_via` | target, via | everything entering target comes from via |
| `single_owner` | target | at most one incoming block |
| `connected` | — | no isolated block (a zone containing blocks doesn't count) |
| `prop` | source, prop, value | every block of this type has the property |
| `edge_kind` | source, target, kind | arrows exist and all are of this kind |
| `count` | source, min?, max? | number of blocks of this type |
| `in_zone` | source, target | every block of this type is inside a zone of type target |
| `link` | source, target, value | a block **named** source is linked to a block **named** target by an arrow with **label** value (case-insensitive) |
| `tree_shape` | source, tree | blocks of this type (parent → child arrows) form the tree `tree: {keys, children}`, children read left to right |

## `worksheet` exercise (interactive sheet, no code)
```
labs/<slug>/
  lab.yaml          kind: worksheet, files_editable: ["answers.json"], entrypoint: starter/
  worksheet.yaml    PUBLIC: intro + displayed blocks
  tests/feedback.yaml   PRIVATE: tolerances and wrong-answer explanations
  solution/answers.json reference answers (never sent)
  starter/answers.json  {}
  debrief.md        revealed after success: the "why" and the formula
  hints.md, instructions.md
```
`worksheet.yaml`: `intro` (markdown) and `blocks`, each with `id`, `type`, `title`, `prompt`:
| type | fields | answer (`answers.json`) |
|---|---|---|
| `number` | `unit` | number |
| `choice` | `options: [{id, label, hint}]` | option id |
| `multi` | `options` | list of ids |
| `order` | `items: [{id, label}]` | ordered list of ids |
| `match` | `items`, `categories` | `{item: category}` |
| `table` | `columns`, `rows: [{id, label, cells}]` (cells = given cells) | `{"row.column": value}` for each empty cell |
| `tuner` | `params: [{id,min,max,step,default}]`, `metrics: [{id,expr,format}]`, `goals: [{id,label,expr}]` | `{param: value}` (any setting that satisfies the constraints) |

`tests/feedback.yaml`: `blocks: {<id>: {tolerance: {rel, abs}, wrong: "…", options: {<option|item|row.column>: "explanation"}, goals: {<goal>: "explanation"}}}`.
Tuner expressions (`pow exp log log2 sqrt abs ceil floor round min max`, `+ - * / %`, comparisons, `&& || !`) are evaluated by the backend; a constraint is an expression that is true when it equals 1. `format`: `number | percent | bytes | duration-s`.
Every wrong answer must **explain why** without giving the right one. `verify_lab.sh`: the solution passes, the starter fails.

## Workshop: `content/<book>/sandbox/<slug>/`
Exercises outside any module (shown under "Atelier"), in the same format as a lab or a `diagram`. They award XP but do not count toward a module's mastery.

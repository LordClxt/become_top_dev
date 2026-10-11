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
kind: code                              # requis — code | tests (l'apprenant écrit les tests) | diagram | worksheet (voir plus bas)
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

## Exercice `diagram` (schéma d'architecture, éditeur de nœuds)
Même dossier qu'un TP (`lab.yaml`, `starter/`, `solution/`, `tests/`), mais rien n'est exécuté : le backend vérifie un graphe.
```yaml
# lab.yaml
id: ddia-ch02-l01-lab-bitcask-design
title: "Dessine le moteur Bitcask"
kind: diagram
difficulty: 3
xp: 80
entrypoint: starter/
files_editable: ["diagram.json"]          # obligatoire et unique
concepts: [ddia-hash-index]
source: { chapter: 3, pages: "72-75" }
palette:                                  # blocs disponibles
  - { type: hash, component: hash-index, label: "Index de hachage", hint: "Table clé → offset." }
  - { type: active, component: log, label: "Segment actif", hint: "Le seul fichier où l'on écrit." }
verified: { at: 2026-10-10, solution: pass, starter: fail }  # écrit après verify_lab.sh
```
`component` désigne un composant du **catalogue** (`backend/internal/content/catalog.yaml`, servi par `/api/diagram/catalog`) qui fixe icône, famille de couleur et propriétés : navigateur, CDN, load balancer, API gateway, service, worker, PostgreSQL, MySQL, MongoDB, Cassandra, Redis, Memcached, file, Kafka, stockage objet, WAL, memtable, SSTable, page B-tree, leader, réplica, entité de graphe, zone… L'ancien `shape` (client|service|queue|database|external|cache) reste accepté. Plusieurs blocs de palette peuvent partager un composant (`type` les distingue dans les règles).

`diagram.json` (v2 ; le v1 reste lu) :
```json
{"nodes": [{"id": "n1", "type": "hash", "x": 0, "y": 0, "label": "Index", "parent": "zone1", "props": {"role": "cache"}, "w": 380, "h": 250}],
 "edges": [{"id": "e1", "source": "n1", "target": "n2", "kind": "read", "label": "Get"}]}
```
`kind` d'une flèche : `sync` (appel) · `async` · `read` · `write` · `replication`. `parent` place un bloc dans une zone ; `w`/`h` ne servent qu'aux zones ; `props` suit les propriétés du composant (ex. Redis : `role: cache`, page B-tree : `keys: "10 20"`).

`tests/checks.yaml` : règles (types de la palette), libellés en français affichés à l'apprenant. Les blocs ou flèches fautifs sont surlignés après « Vérifier ».
| Règle | Champs | Vérifie |
|---|---|---|
| `path` | source, target, via? | un chemin existe (avec `via` : tous y passent) |
| `no_edge` | source, target | aucune flèche directe |
| `inbound_via` | target, via | tout ce qui entre dans target vient de via |
| `single_owner` | target | au plus un bloc entrant |
| `connected` | — | aucun bloc isolé (une zone qui contient des blocs ne compte pas) |
| `prop` | source, prop, value | chaque bloc de ce type a la propriété |
| `edge_kind` | source, target, kind | il existe des flèches et toutes sont de cette nature |
| `count` | source, min?, max? | nombre de blocs de ce type |
| `in_zone` | source, target | chaque bloc de ce type est dans une zone de type target |
| `link` | source, target, value | un bloc **nommé** source est relié à un bloc **nommé** target par une flèche d'**étiquette** value (sans casse) |
| `tree_shape` | source, tree | les blocs de ce type (flèches parent → enfant) forment l'arbre `tree: {keys, children}`, enfants lus de gauche à droite |

## Exercice `worksheet` (fiche interactive, sans code)
```
labs/<slug>/
  lab.yaml          kind: worksheet, files_editable: ["answers.json"], entrypoint: starter/
  worksheet.yaml    PUBLIC : intro + blocs affichés
  tests/feedback.yaml   PRIVÉ : tolérances et explications des mauvaises réponses
  solution/answers.json réponses de référence (jamais envoyées)
  starter/answers.json  {}
  debrief.md        dévoilé après réussite : le « pourquoi » et la formule
  hints.md, instructions.md
```
`worksheet.yaml` : `intro` (markdown) et `blocks`, chacun avec `id`, `type`, `title`, `prompt` :
| type | champs | réponse (`answers.json`) |
|---|---|---|
| `number` | `unit` | nombre |
| `choice` | `options: [{id, label, hint}]` | id de l'option |
| `multi` | `options` | liste d'ids |
| `order` | `items: [{id, label}]` | liste ordonnée des ids |
| `match` | `items`, `categories` | `{item: catégorie}` |
| `table` | `columns`, `rows: [{id, label, cells}]` (cells = cases données) | `{"ligne.colonne": valeur}` pour chaque case vide |
| `tuner` | `params: [{id,min,max,step,default}]`, `metrics: [{id,expr,format}]`, `goals: [{id,label,expr}]` | `{param: valeur}` (n'importe quel réglage qui satisfait les contraintes) |

`tests/feedback.yaml` : `blocks: {<id>: {tolerance: {rel, abs}, wrong: "…", options: {<option|item|ligne.colonne>: "explication"}, goals: {<goal>: "explication"}}}`.
Les expressions du tuner (`pow exp log log2 sqrt abs ceil floor round min max`, `+ - * / %`, comparaisons, `&& || !`) sont évaluées par le backend ; une contrainte est une expression vraie quand elle vaut 1. `format` : `number | percent | bytes | duration-s`.
Chaque mauvaise réponse doit **expliquer pourquoi** sans donner la bonne. `verify_lab.sh` : la solution passe, le starter échoue.

## Atelier : `content/<livre>/sandbox/<slug>/`
Exercices hors module (affichés dans « Atelier »), au même format qu'un TP ou un `diagram`. Ils rapportent de l'XP mais ne comptent pas dans la maîtrise d'un module.

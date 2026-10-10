# AGENTS.md — become_top_dev

Plateforme personnelle d'apprentissage du code (inspirée de boot.dev, plus belle, plus profonde).
Un seul utilisateur. Objectif : devenir un développeur top 1 %.

## Principe central
- Les cours sont construits **par l'agent** à partir des livres de `books/`. L'app n'importe aucun livre.
- Le contenu est généré à l'avance, versionné dans `content/`, puis chargé par l'app.
- Reformuler et enseigner. Jamais de longs extraits du livre. Toujours citer `source: {chapter, pages}`.
- Livres actuels :
  - `learning-go` — *Learning Go, 2nd ed.* (Bodner) → TP codés en Go, testés.
  - `software-architecture` — *Fundamentals of Software Architecture* (Richards & Ford) → TP conceptuels (katas, ADR, diagrammes) notés par rubrique + revue IA.

## Workflow (obligatoire, dans l'ordre)
1. Lire le livre **en entier** (`book-ingest`) puis proposer plan du cours, format de contenu, features MVP/v2/v3 (`course-plan`). **STOP — attendre l'accord.**
2. Proposer l'architecture avec trade-offs explicites. **STOP — attendre l'accord.**
3. Construire le MVP sur **un** chapitre complet de bout en bout (leçon, TP testés, quiz, XP).
4. Générer le reste du livre chapitre par chapitre (`chapter-content`). **STOP après chaque chapitre.**
- Si ambigu : poser **une seule** question à la fois.
- Réponses concises : décisions → trade-offs → code.

## Stack (modifiable, mais justifier tout changement)
- Backend : Python 3.12+, FastAPI, PostgreSQL, SQLAlchemy 2 + Alembic. Monolithe en couches :
  `api/ → services/ → repositories/ → models/`. Pas d'accès DB depuis `api/`.
- Front : TanStack Start (React) + shadcn/ui + Tailwind. Sombre par défaut + thème clair. Desktop-first.
- Sandbox : conteneurs Docker éphémères (`--network none`, CPU/mémoire/timeout limités, FS en lecture seule sauf `/work`).
- Déploiement : Docker Compose sur Coolify.
- Visuels : Remotion pour les animations linéaires. Reco par défaut (à confirmer à l'étape 2) :
  `@remotion/player` côté client pour les visuels pré-générés ; rendu mp4 serveur seulement pour l'export.

## Décisions d'architecture (validées étape 2)
- Contenu = fichiers `content/` (source de vérité), chargés et validés par le backend au démarrage. Les visuels React de `content/` sont importés par le front au build.
- PostgreSQL = uniquement l'état utilisateur (XP, tentatives, progression, coach), référencé par les `id` du contenu.
- Exécution du code : service `runner/` séparé, seul à parler à Docker ; un conteneur jetable par exécution (`--network none`, limites CPU/mém/pids/temps). Le backend n'accède jamais au socket Docker.
- Éditeur : CodeMirror 6. Remotion : `@remotion/player` côté client uniquement (pas de SSR) ; rendu mp4 serveur reporté en v3.
- Auth : mot de passe unique + session cookie (un seul utilisateur).
- Coach IA (v2) : API Claude depuis le backend, réponses en streaming.

## Arborescence cible
```
books/                     PDF sources (jamais committés)
.cache/books/<slug>/       texte extrait (jamais committé)
content/<book>/            cours générés (voir skill content-format)
backend/                   FastAPI
runner/                    service d'exécution (seul accès à Docker)
frontend/                  TanStack Start
sandbox/images/<lang>/     Dockerfiles des runners (go, python…)
design-system/             tokens partagés UI + visuels (couleurs, typo, motion)
```

## Règles qualité non négociables
- Un TP n'est livré que si `verify_lab.sh` passe : la **solution passe** les tests ET le **starter échoue**.
- Pas de faux tests pour les exercices non exécutables : utiliser une rubrique.
- Chaque visuel a une justification de format en une ligne.
- Le contenu doit être valide selon `content-format/reference/schemas.md`.

## Conventions
- Code, identifiants, chemins, clés YAML : **anglais**. UI et contenus pédagogiques : **français**.
- IDs stables en kebab-case (`go-ch02-l03-constants`) : ils servent de clés pour la progression en DB.
- Pas de dépendance ajoutée sans une ligne de justification.

## Skills (`.claude/skills/`)
| Skill | Quand |
|---|---|
| `book-ingest` | Lire / extraire un livre de `books/` |
| `course-plan` | Étape 1 : proposer le plan d'un cours |
| `content-format` | Toute lecture/écriture dans `content/` |
| `chapter-content` | Générer le contenu complet d'un chapitre |
| `lab-authoring` | Créer/modifier un TP, devoir ou boss fight testé |
| `concept-visual` | Créer un visuel de concept (Remotion / interactif / statique) |
| `simulation-design` | Concevoir une simulation « jeu » programmable |
| `frontend-ui` | Travail dans `frontend/` |
| `frontend-design` | Direction visuelle d'une page / du `design-system/` (avant `frontend-ui`) |
| `backend-api` | Travail dans `backend/` |

## Commandes
- `make dev` — tout lancer en local : Postgres (Docker, port 5433), runner :8001, backend :8000, frontend http://localhost:3000 (mot de passe de dev : `dev`)
- `make test` — tests backend + runner + contrôle de types du frontend
- `make lint` — ruff (backend, runner)
- `make validate-content` — rejoue tous les TP (solution passe, starter échoue) et tous les quiz « code-output »
- `make up` / `make down` — pile complète via Docker Compose (`.env` à créer depuis `.env.example`)
- `make reset-progress` — remet la progression locale à zéro
- `python3 .claude/skills/book-ingest/scripts/extract_book.py <pdf> --slug <slug>` — extraire un livre
- `.claude/skills/lab-authoring/scripts/verify_lab.sh <dir>` — valider un exercice
- `python3 .claude/skills/lab-authoring/scripts/verify_quiz.py <chapitre>` — valider les quiz d'un chapitre

## Déploiement (Coolify)
`docker-compose.yaml` à la racine. Pointer le domaine vers le service `proxy` (port 80) ; Caddy envoie `/api/*` au backend et le reste au frontend. Le port hôte local est publié uniquement via `docker-compose.override.yaml`. Variables : voir `.env.example`. Le `runner` monte le socket Docker de l'hôte : ne jamais l'exposer.

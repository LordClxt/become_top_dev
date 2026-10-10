# become_top_dev

Plateforme personnelle d'apprentissage du code, inspirée de boot.dev : des cours construits à partir de livres de référence, avec leçons, TP testés en sandbox, quiz, flashcards, projets, boss fights et XP. Un seul utilisateur, un objectif : devenir un développeur top 1 %.

## Cours

| Cours | Livre | Type | État |
|---|---|---|---|
| `go` — Go idiomatique | *Learning Go, 2nd ed.* (Bodner) | TP codés en Go, testés | ch. 00 et 02 complets, ch. 10 en cours |
| `ddia` — Systèmes de données | *Designing Data-Intensive Applications* (Kleppmann) | TP Go, fil rouge Tinybase | plan validé |
| `arch` — Architecte logiciel | *Fundamentals of Software Architecture* (Richards & Ford) | katas, ADR, diagrammes notés par rubrique | plan validé, premier kata dans l'Atelier |

Le contenu est généré à l'avance par l'agent à partir des livres de `books/`, versionné dans `content/` puis chargé par l'app. Les livres et leurs extractions (`books/`, `.cache/`) ne sont jamais committés.

## Stack

- **Backend** : Go (net/http), PostgreSQL via pgx, migrations goose. Monolithe en couches `internal/api → service → repository → model`.
- **Runner** : service Go séparé (bibliothèque standard uniquement), seul à parler à Docker. Un conteneur jetable par exécution (`--network none`, limites CPU, mémoire, pids et temps).
- **Frontend** : TanStack Start (React), shadcn/ui, Tailwind, CodeMirror 6, React Flow (exercices de diagramme), `@remotion/player` et HyperFrames pour les visuels.
- **Déploiement** : Docker Compose sur Coolify, Caddy en reverse proxy.

```
content/<livre>/     cours générés (source de vérité du contenu)
backend/             API Go (état utilisateur : XP, tentatives, progression)
runner/              exécution du code en sandbox
frontend/            app TanStack Start
sandbox/images/      images Docker des runners (go…)
deploy/              Caddyfile + image du proxy
scripts/             dev.sh, validate_content.sh
```

## Démarrer en local

Prérequis : Docker, [uv](https://docs.astral.sh/uv/), Node + pnpm.

```bash
make dev
```

Lance Postgres (Docker, port 5433), le runner (:8001), le backend (:8000) et le frontend sur http://localhost:3000. Mot de passe de dev : `dev`.

## Commandes

| Commande | Rôle |
|---|---|
| `make dev` | Tout lancer en local |
| `make test` | Tests backend + runner + contrôle de types du frontend |
| `make lint` | gofmt + go vet (backend, runner) |
| `make validate-content` | Rejouer tous les TP (solution passe, starter échoue) et les quiz « code-output » |
| `make up` / `make down` | Pile complète via Docker Compose |
| `make reset-progress` | Remettre la progression locale à zéro |

## Déploiement (Coolify)

1. Créer `.env` à partir de `.env.example` et remplacer chaque valeur (`SECURE_COOKIES=true` derrière HTTPS).
2. Déployer `docker-compose.yaml` et pointer le domaine vers le service `proxy` (port 80). Caddy envoie `/api/*` au backend et le reste au frontend.

Le `runner` monte le socket Docker de l'hôte : ne jamais l'exposer publiquement.

## Contribuer au contenu

Le workflow complet (lecture du livre, plan, génération chapitre par chapitre) et les règles qualité sont dans [AGENTS.md](AGENTS.md). Règle clé : un TP n'est livré que si `verify_lab.sh` passe — la solution réussit les tests et le starter échoue.

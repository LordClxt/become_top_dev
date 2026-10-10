---
name: backend-api
description: Conventions pour tout travail dans backend/ — FastAPI en monolithe en couches, PostgreSQL, SQLAlchemy 2, Alembic, loader du contenu content/, service sandbox Docker, XP/progression, coach IA. À utiliser pour créer endpoints, modèles, migrations, services ou tests backend.
---

# backend-api

## Couches (dépendances dans un seul sens)
```
backend/app/
  api/            # routers FastAPI : validation I/O (Pydantic), aucun SQL, aucune logique métier
  services/       # logique métier (xp, progression, mastery, sandbox, coach, content)
  repositories/   # accès DB (SQLAlchemy 2, async)
  models/         # ORM
  schemas/        # Pydantic in/out
  content/        # loader : lit content/, valide les schémas, index en mémoire
  core/           # config (pydantic-settings), db, logging
backend/migrations/  # Alembic
backend/tests/
```
`api → services → repositories → models`. Jamais l'inverse, jamais `api → repositories`.

## Règles
- Le contenu de cours vient des **fichiers** `content/` (source de vérité), pas de la DB. La DB stocke uniquement l'état utilisateur : progression, tentatives, XP, streaks, révisions espacées, conversations du coach — référencés par les `id` stables du contenu.
- Le loader valide tout `content/` au démarrage (schémas `content-format`) et échoue bruyamment si invalide.
- Sandbox : `services/sandbox.py` lance un conteneur éphémère (`--network none`, limites CPU/mem/pids, timeout, FS read-only sauf `/work`), même logique que `verify_lab.sh`. Ne jamais exécuter du code utilisateur dans le process API.
- Secrets (token GitHub, clé API IA) via variables d'environnement, chiffrés au repos s'ils sont stockés.
- Coach IA : SDK Anthropic, modèle configurable ; contexte = contenu de la leçon + historique de la conversation.
- Chaque migration Alembic est relue (pas d'autogenerate aveugle).

## Tests
- pytest + pytest-asyncio, Postgres de test via Docker.
- Tests de service sans HTTP ; quelques tests d'API end-to-end par router.

## Definition of Done
- [ ] Respect des couches
- [ ] Migration Alembic si le modèle change
- [ ] Tests ajoutés, `make test` passe
- [ ] `ruff check && ruff format --check && mypy` propres

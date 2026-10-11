---
name: backend-api
description: Conventions for all work in backend/ — layered FastAPI monolith, PostgreSQL, SQLAlchemy 2, Alembic, content/ loader, Docker sandbox service, XP/progress, AI coach. Use it to create backend endpoints, models, migrations, services or tests.
---

# backend-api

## Layers (dependencies flow one way only)
```
backend/app/
  api/            # FastAPI routers: I/O validation (Pydantic), no SQL, no business logic
  services/       # business logic (xp, progress, mastery, sandbox, coach, content)
  repositories/   # DB access (SQLAlchemy 2, async)
  models/         # ORM
  schemas/        # Pydantic in/out
  content/        # loader: reads content/, validates schemas, in-memory index
  core/           # config (pydantic-settings), db, logging
backend/migrations/  # Alembic
backend/tests/
```
`api → services → repositories → models`. Never the reverse, never `api → repositories`.

## Rules
- Course content comes from the `content/` **files** (source of truth), not from the DB. The DB stores only user state: progress, attempts, XP, streaks, spaced repetition, coach conversations — referenced by the stable content `id`s.
- The loader validates all of `content/` at startup (`content-format` schemas) and fails loudly if anything is invalid.
- Sandbox: `services/sandbox.py` starts an ephemeral container (`--network none`, CPU/mem/pids limits, timeout, read-only FS except `/work`), same logic as `verify_lab.sh`. Never run user code inside the API process.
- Secrets (GitHub token, AI API key) come from environment variables, encrypted at rest if stored.
- AI coach: Anthropic SDK, configurable model; context = lesson content + conversation history.
- Every Alembic migration is reviewed (no blind autogenerate).

## Tests
- pytest + pytest-asyncio, test Postgres via Docker.
- Service tests without HTTP; a few end-to-end API tests per router.

## Definition of Done
- [ ] Layers respected
- [ ] Alembic migration if the model changes
- [ ] Tests added, `make test` passes
- [ ] `ruff check && ruff format --check && mypy` clean

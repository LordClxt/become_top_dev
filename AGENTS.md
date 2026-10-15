# AGENTS.md — become_top_dev

Personal platform for learning to code (inspired by boot.dev, more beautiful, deeper).
Invite-only, several users (the owner is the admin). Goal: become a top 1 % developer.

## Core principle
- Courses are built **by the agent** from the books in `books/`. The app imports no books.
- Content is generated ahead of time, versioned in `content/`, then loaded by the app.
- Rephrase and teach. Never long excerpts from the book. Always cite `source: {chapter, pages}`.
- Current books:
  - `learning-go` — *Learning Go, 2nd ed.* (Bodner) → labs coded in Go, tested.
  - `software-architecture` — *Fundamentals of Software Architecture* (Richards & Ford) → conceptual labs (katas, ADRs, diagrams) graded by rubric + AI review.
  - `programming-grails` (EPUB, Grails 2.2) + `groovy-in-action` (2nd ed., Groovy 2.4) → **one course** (`content/grails/`) built on both books; labs in Groovy 4 / JDK 17 (target: Grails 7). A course may list extra books in `course.yaml` (`books:`) and a `source.book` slug per lesson. The books are older than the target: gaps are marked `extra`.

## Workflow (mandatory, in order)
1. Read the book **in full** (`book-ingest`), then propose the course plan, content format, and MVP/v2/v3 features (`course-plan`). **STOP — wait for approval.**
2. Propose the architecture with explicit trade-offs. **STOP — wait for approval.**
3. Build the MVP on **one** complete chapter end to end (lesson, tested labs, quiz, XP).
4. Generate the rest of the book chapter by chapter (`chapter-content`). **STOP after each chapter.**
- If something is ambiguous: ask **a single** question at a time.
- Concise answers: decisions → trade-offs → code.

## Stack (can change, but justify every change)
- Backend: Go (net/http), PostgreSQL via pgx (hand-written SQL), goose migrations. Layered monolith:
  `internal/api → service → repository → model`. No DB access from `api`.
- Front end: TanStack Start (React) + shadcn/ui + Tailwind. Dark by default + light theme. Desktop-first.
- Sandbox: ephemeral Docker containers (`--network none`, limited CPU/memory/timeout, read-only FS except `/work`).
- Deployment: Docker Compose on Coolify.
- Visuals: Remotion for linear animations. Default recommendation (to confirm at step 2):
  `@remotion/player` client-side for pre-generated visuals; server-side mp4 rendering only for export.

## Architecture decisions (approved at step 2)
- Content = `content/` files (source of truth), loaded and validated by the backend at startup. The React visuals in `content/` are imported by the front end at build time.
- PostgreSQL = accounts + user state only (XP, attempts, progress, coach), referenced by the content `id`s.
- Code execution: a separate `runner/` service, the only one that talks to Docker; one throwaway container per run (`--network none`, CPU/mem/pids/time limits). The backend never touches the Docker socket.
- Editor: CodeMirror 6. Remotion: `@remotion/player` client-side only (no SSR); server-side mp4 rendering deferred to v3.
- Auth: email + password accounts (argon2id), sessions stored in DB (cookie = random token, DB keeps its SHA-256), sign-up only with a single-use invite code created by the admin. All user state is keyed by `user_id`; repositories are user-scoped (`Repos.Progress(uid)`). Runner runs are limited per user, login/sign-up per IP.
- AI coach (v2): Claude API from the backend, streamed responses.

## Target tree
```
books/                     source PDFs (never committed)
.cache/books/<slug>/       extracted text (never committed)
content/<book>/            generated courses (see the content-format skill)
backend/                   Go API (cmd/btd, internal/)
runner/                    execution service (only Docker access)
frontend/                  TanStack Start
sandbox/images/<lang>/     runner Dockerfiles (go, groovy…)
design-system/             shared UI + visual tokens (colors, typography, motion)
```

## Non-negotiable quality rules
- A lab ships only if `verify_lab.sh` passes: the **solution passes** the tests AND the **starter fails**.
- No fake tests for non-executable exercises: use a `diagram` or `worksheet` exercise (graded by the backend, no code), with no self-graded rubric.
- Every visual has a one-line justification of its format.
- Content must be valid according to `content-format/reference/schemas.md`.

## Conventions
- Code, identifiers, paths, YAML keys: **English**. UI and teaching content: **French**.
- Stable kebab-case IDs (`go-ch02-l03-constants`): they are the keys for progress in the DB.
- No added dependency without a one-line justification.

## Skills (`.claude/skills/`)
| Skill | When |
|---|---|
| `book-ingest` | Read / extract a book from `books/` |
| `course-plan` | Step 1: propose a course plan |
| `content-format` | Any read/write in `content/` |
| `chapter-content` | Generate the complete content of a chapter |
| `lab-authoring` | Create/modify a tested lab, assignment or boss fight |
| `concept-visual` | Create a concept visual (Remotion / interactive / static) |
| `simulation-design` | Design a programmable "game" simulation |
| `frontend-ui` | Work in `frontend/` |
| `frontend-design` | Visual direction for a page / the `design-system/` (before `frontend-ui`) |
| `backend-api` | Work in `backend/` |

## Commands
- `make dev` — run everything locally: Postgres (Docker, port 5433), runner :8001, backend :8000, frontend http://localhost:3000 (dev account: `dev@btd.local` / `dev`)
- `make test` — backend + runner tests + front-end type check
- `make lint` — gofmt + go vet (backend, runner)
- `make validate-content` — replays every lab (code, diagram, worksheet: solution passes, starter fails) and every "code-output" quiz
- `make up` / `make down` — full stack via Docker Compose (create `.env` from `.env.example`)
- `make reset-progress` — resets local progress to zero (all accounts)
- `cd backend && go run ./cmd/btd reset-password <email>` — new password read from stdin, closes the account's sessions
- `python3 .claude/skills/book-ingest/scripts/extract_book.py <pdf> --slug <slug>` — extract a book
- `.claude/skills/lab-authoring/scripts/verify_lab.sh <dir>` — validate an exercise
- `python3 .claude/skills/lab-authoring/scripts/verify_quiz.py <chapter>` — validate a chapter's quizzes

## Deployment (Coolify)
`docker-compose.yaml` at the root. Point the domain at the `proxy` service (port 80); Caddy sends `/api/*` to the backend and everything else to the front end. The local host port is published only through `docker-compose.override.yaml`. PostgreSQL is external to the stack: the backend connects to it through `DATABASE_URL`. Variables: see `.env.example` (`ADMIN_EMAIL` / `ADMIN_PASSWORD` claim the owner account on first start, then are ignored). The `runner` mounts the host's Docker socket: never expose it.

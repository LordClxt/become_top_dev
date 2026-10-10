#!/usr/bin/env bash
# Lance tout en local : Postgres (Docker), runner, backend et frontend. Ctrl+C arrête tout.
set -euo pipefail
cd "$(dirname "$0")/.."

docker build -q -t btd-runner-go sandbox/images/go >/dev/null
if ! docker ps --format '{{.Names}}' | grep -q '^btd-db$'; then
  docker start btd-db >/dev/null 2>&1 || docker run -d --name btd-db \
    -e POSTGRES_USER=btd -e POSTGRES_PASSWORD=btd -e POSTGRES_DB=btd -p 5433:5432 postgres:17-alpine >/dev/null
  until docker exec btd-db pg_isready -U btd >/dev/null 2>&1; do sleep 1; done
fi

trap 'kill 0' EXIT
(cd runner && RUNNER_ADDR=127.0.0.1:8001 go run .) &
(cd backend && BTD_ADDR=127.0.0.1:8000 go run ./cmd/btd serve) &  # applique les migrations au démarrage
(cd frontend && pnpm dev) &
echo "→ http://localhost:3000  (mot de passe de dev : dev)"
wait

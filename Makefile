.PHONY: dev test lint validate-content up down reset-progress

dev: ## Tout lancer en local (http://localhost:3000)
	./scripts/dev.sh

test: ## Tests backend + runner + contrôle de types du frontend
	cd backend && go test ./...
	cd runner && go test ./...
	cd frontend && pnpm typecheck

lint:
	cd backend && test -z "$$(gofmt -l .)" && go vet ./...
	cd runner && test -z "$$(gofmt -l .)" && go vet ./...

validate-content: ## Rejouer tous les TP et quiz du contenu
	./scripts/validate_content.sh

up: ## Déploiement local avec Docker Compose (.env requis)
	docker compose up -d --build

down:
	docker compose down

reset-progress: ## Remettre la progression locale à zéro (base de dev)
	docker exec btd-db psql -U btd -c "TRUNCATE xp_events, lesson_progress, exercise_progress, exercise_runs, quiz_answers"

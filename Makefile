.PHONY: dev build test lint migrate seed docker-up docker-down clean

dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-clean:
	docker compose down -v --remove-orphans

# Backend
backend-dev:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

backend-test:
	cd backend && python -m pytest tests/ -v

backend-lint:
	cd backend && ruff check app/ && ruff format --check app/

backend-format:
	cd backend && ruff format app/

# Frontend
frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

frontend-lint:
	cd frontend && npm run lint

frontend-test:
	cd frontend && npm run test

# Database
migrate:
	cd backend && alembic upgrade head

migrate-create:
	cd backend && alembic revision --autogenerate -m "$(msg)"

migrate-rollback:
	cd backend && alembic downgrade -1

seed:
	cd backend && python -m app.scripts.seed

# Combined
test: backend-test frontend-test
lint: backend-lint frontend-lint

# Infrastructure only (no app containers)
infra:
	docker compose up -d postgres redis qdrant

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true

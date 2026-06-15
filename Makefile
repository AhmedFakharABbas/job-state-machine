.PHONY: setup run stop fresh test test-backend test-frontend

setup:
	docker compose build

run:
	docker compose up -d

fresh:
	docker compose down --remove-orphans
	docker compose up -d --build

stop:
	docker compose down

test-backend:
	cd backend && npm install && npm test

test-frontend:
	cd frontend && npm install && npm test

test:
	cd harness && npm install && npx playwright test

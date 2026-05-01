.PHONY: dev install build up down logs rebuild lint preview

dev:
	bun run dev

install:
	bun install

build:
	bun run build

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

rebuild:
	docker compose down && docker compose up -d --build

lint:
	bun run lint

preview:
	bun run preview

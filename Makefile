.PHONY: dev install build up down logs rebuild lint preview

dev:
	npm run dev

install:
	npm ci

build:
	npm run build

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

rebuild:
	docker compose down && docker compose up -d --build

lint:
	npm run lint

preview:
	npm run preview

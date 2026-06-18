# Atalhos de desenvolvimento do BioShield AI (preencher as receitas)
.PHONY: setup migrate seed run test lint

setup:    # instala dependencias (backend, frontend, ai_edge)
migrate:  # aplica migracoes do banco (Alembic)
seed:     # carrega database/seed.sql
run:      # sobe o ambiente via docker compose
test:     # roda os testes
lint:     # roda linters/formatadores

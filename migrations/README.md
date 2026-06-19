# 🗄️ migrations — Evolução do Banco de Dados

Histórico versionado de mudanças no schema `vigilis` (PostgreSQL). **Responsável:** Pedro (Backend / Segurança / DB).

## Baseline

- [`database/schema.sql`](../database/schema.sql) — DDL canônico **v1.3** + dicionário de dados. É o ponto de partida do banco (a equipe se refere a ele como *"schema_2.sql"*). As migrações abaixo evoluem **a partir dele**.

## Migrações

| Data | Arquivo | Descrição |
|---|---|---|
| 2026-06-18 | [`2026-06-18_fix-mfa-bypass.sql`](2026-06-18_fix-mfa-bypass.sql) | **Correção de segurança (RNF-19).** Trigger `BEFORE UPDATE` em `users` que bloqueia desativar `mfa_enabled` (`TRUE→FALSE`) enquanto o usuário mantém papel com `can_view_evidence = TRUE`. Fecha o bypass de desativação manual do MFA por quem já tinha acesso à evidência. Complementa `require_mfa_evidence_role`. |

## Como aplicar

Cada migração é **SQL idempotente** com `SET search_path TO vigilis` no topo. Aplique em ordem cronológica, **sobre o baseline**:

```bash
# 1) baseline (extraia o SQL do bloco ```sql do schema.sql — ver scripts/apply_schema.sh)
psql -U postgres -d bioshield -f database/schema.sql

# 2) migrações, em ordem de data
psql -U postgres -d bioshield -f migrations/2026-06-18_fix-mfa-bypass.sql
```

## Convenções

- Nome do arquivo: **`AAAA-MM-DD_descricao-curta.sql`**.
- Toda migração é **incremental e idempotente** (nunca recria o banco).
- `SET search_path TO vigilis;` na primeira linha.

> **Nota:** `database/migrations/` é o **esqueleto do Alembic** — reservado para quando o `backend/` adotar models SQLAlchemy e gerar migrações automáticas. As migrações **SQL manuais** (como esta de MFA) ficam aqui em **`/migrations`**.

# scripts — Utilitários de desenvolvimento e operação

> **Siglas desta pasta.** **DDL** — *Data Definition Language*, a parte do SQL que cria a estrutura do banco. **libpq** — a biblioteca cliente do PostgreSQL, de onde vêm as variáveis `PGHOST`, `PGUSER` e afins. **CI** — Integração Contínua. **WSL** — *Windows Subsystem for Linux*, que permite rodar scripts `.sh` no Windows. **shebang** — a primeira linha `#!/usr/bin/env bash`, que diz ao sistema com qual interpretador executar o arquivo. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

Scripts de apoio para levantar e recarregar o ambiente local. São **atalhos de desenvolvimento**, não parte do runtime: nada aqui roda em produção, e o `Makefile` da raiz é a porta de entrada pretendida para eles.

## Conteúdo atual

| Script | Papel |
|---|---|
| `apply_schema.sh` | **Implementado.** Extrai o DDL de dentro do bloco Markdown do `database/schema.sql` e aplica no banco, seguido das migrações de `/migrations` em ordem cronológica. É o único caminho correto para carregar o schema — o arquivo não é SQL puro. |
| `reset_db.sh` | Derruba e recria o banco local, reaplicando schema, migrações e seed. Uso estritamente local. **Ainda é esqueleto.** |
| `run_dev.sh` | Sobe os serviços em modo desenvolvimento (banco via Docker, backend e frontend). **Ainda é esqueleto.** |

### `apply_schema.sh`

```bash
scripts/apply_schema.sh                    # banco novo: baseline + migrações
scripts/apply_schema.sh --with-seed        # ... e o seed de demonstração
scripts/apply_schema.sh --migrations-only  # banco existente: só as migrações
scripts/apply_schema.sh --extract-only     # imprime o DDL puro no stdout
```

Conexão pelas variáveis padrão do libpq (`PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`, `PGPASSWORD`); sem elas, assume `postgres@localhost/bioshield`.

Uma assimetria que o script torna explícita: o **baseline roda uma vez só** — seus `CREATE TYPE`/`CREATE TABLE` não têm guarda e falham se o schema já existir. As **migrações são idempotentes**. Se você aplicar o baseline num banco já criado, o script falha e diz para usar `--migrations-only`, em vez de deixar um erro críptico do psql.

É o mesmo script que a CI executa em [`database-ci.yml`](../.github/workflows/database-ci.yml), então ele não pode divergir do que roda no pipeline.

## O que ainda entra aqui

- Implementação de `reset_db.sh` e `run_dev.sh`.
- Um script de verificação do ambiente (`check_env.sh`) que valide as variáveis obrigatórias do `.env` antes de subir, em vez de descobrir a variável faltando no meio da execução.
- Equivalentes `.ps1` ou uso via WSL/Git Bash — o time desenvolve em Windows, e scripts `.sh` puros exigem esse cuidado. O `apply_schema.sh` depende de `bash`, `awk` e `psql` no PATH.

## Convenções

- Scripts destrutivos (`reset_db.sh`) devem pedir confirmação explícita e recusar rodar se a `DATABASE_URL` apontar para algo que não seja `localhost`.
- Nenhum script deve conter senha, chave ou token — tudo vem do `.env`.
- Todos assumem execução a partir da **raiz do repositório**, não de dentro de `scripts/`.

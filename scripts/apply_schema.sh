#!/usr/bin/env bash
#
# Extrai o DDL de dentro do bloco markdown do database/schema.sql e aplica no banco.
#
# O schema.sql é um documento Markdown com o DDL executável dentro de um único
# bloco ```sql — ele NÃO pode ser passado direto ao psql. Este script isola o
# bloco, aplica o baseline e, na sequência, as migrações de /migrations em ordem
# cronológica (todas idempotentes, então reaplicar é inofensivo).
#
# Uso:
#   scripts/apply_schema.sh                    # baseline + migrações
#   scripts/apply_schema.sh --with-seed        # ... e ainda o seed de demonstração
#   scripts/apply_schema.sh --migrations-only  # só as migrações (banco já existente)
#   scripts/apply_schema.sh --extract-only     # só imprime o DDL puro no stdout
#
# IMPORTANTE: o baseline é um script de criação, roda UMA vez em banco novo — os
# CREATE TYPE/TABLE dele não têm guarda e falham se o schema já existir. Só as
# migrações são idempotentes. Para um banco já existente, use --migrations-only.
#
# Conexão: usa as variáveis padrão do libpq (PGHOST, PGPORT, PGUSER, PGDATABASE,
# PGPASSWORD). Sem elas, assume postgres@localhost/bioshield.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_MD="$REPO_ROOT/database/schema.sql"
SEED_SQL="$REPO_ROOT/database/seed.sql"
MIGRATIONS_DIR="$REPO_ROOT/migrations"

WITH_SEED=0
EXTRACT_ONLY=0
MIGRATIONS_ONLY=0
for arg in "$@"; do
    case "$arg" in
        --with-seed)       WITH_SEED=1 ;;
        --extract-only)    EXTRACT_ONLY=1 ;;
        --migrations-only) MIGRATIONS_ONLY=1 ;;
        -h|--help)         sed -n '2,26p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *) echo "Argumento desconhecido: $arg" >&2; exit 2 ;;
    esac
done

[[ -f "$SCHEMA_MD" ]] || { echo "ERRO: não encontrei $SCHEMA_MD" >&2; exit 1; }

# --- Extração do bloco ```sql -----------------------------------------------
extract_ddl() {
    awk '/^```sql$/ { flag=1; next } /^```/ { if (flag) exit } flag' "$SCHEMA_MD"
}

DDL="$(extract_ddl)"
if [[ -z "${DDL// }" ]]; then
    echo "ERRO: nenhum bloco \`\`\`sql encontrado em $SCHEMA_MD." >&2
    echo "      O formato do arquivo mudou? Ver database/README.md." >&2
    exit 1
fi

if [[ $EXTRACT_ONLY -eq 1 ]]; then
    printf '%s\n' "$DDL"
    exit 0
fi

command -v psql >/dev/null 2>&1 || { echo "ERRO: psql não encontrado no PATH." >&2; exit 1; }

export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"
export PGDATABASE="${PGDATABASE:-bioshield}"

TMP_DDL="$(mktemp)"
trap 'rm -f "$TMP_DDL"' EXIT
printf '%s\n' "$DDL" > "$TMP_DDL"

if [[ $MIGRATIONS_ONLY -eq 1 ]]; then
    echo ">> Pulando o baseline (--migrations-only)."
else
    echo ">> Baseline: aplicando o DDL de database/schema.sql em $PGUSER@$PGHOST:$PGPORT/$PGDATABASE"
    if ! psql -v ON_ERROR_STOP=1 -q -f "$TMP_DDL"; then
        echo "" >&2
        echo "ERRO ao aplicar o baseline. Se a causa foi 'already exists', o schema já" >&2
        echo "existe neste banco: o baseline roda uma vez só, em banco novo. Use" >&2
        echo "  scripts/apply_schema.sh --migrations-only" >&2
        echo "para apenas atualizar um banco existente, ou recrie o banco do zero." >&2
        exit 1
    fi
fi

# --- Migrações, em ordem cronológica ----------------------------------------
# O baseline já incorpora todas elas; reaplicar é redundante mas inofensivo, e
# mantém o mesmo caminho válido para bancos criados a partir de versões antigas.
shopt -s nullglob
for migration in "$MIGRATIONS_DIR"/[0-9]*.sql; do
    echo ">> Migração: $(basename "$migration")"
    psql -v ON_ERROR_STOP=1 -q -f "$migration"
done
shopt -u nullglob

# --- Seed opcional -----------------------------------------------------------
if [[ $WITH_SEED -eq 1 ]]; then
    [[ -f "$SEED_SQL" ]] || { echo "ERRO: não encontrei $SEED_SQL" >&2; exit 1; }
    echo ">> Seed de demonstração (apenas desenvolvimento)"
    psql -v ON_ERROR_STOP=1 -f "$SEED_SQL"
fi

echo ">> Concluído."

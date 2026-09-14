# database — Schema, dados de demonstração e esqueleto Alembic

> **Siglas desta pasta.** **DDL** — *Data Definition Language*, a parte do SQL que cria tabelas, tipos e restrições. **SQL** — *Structured Query Language*, a linguagem do banco. **MFA** — Autenticação Multifator. **CI** — *Continuous Integration*, a Integração Contínua que valida o banco a cada envio de código. **Alembic** — a ferramenta de migração do SQLAlchemy. **trigger** (gatilho) — rotina que o banco dispara sozinho antes ou depois de uma operação. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

Camada de dados do BioShield AI: **PostgreSQL 14+**, schema técnico `vigilis`. É a frente mais madura do repositório — enquanto o código das outras pastas ainda é esqueleto, o DDL aqui já está escrito e é a **fonte da verdade** sobre tabelas, constraints e triggers. Os models SQLAlchemy do `backend/` devem espelhar o que está definido neste diretório, e não o contrário.

## Conteúdo atual

| Arquivo | Papel |
|---|---|
| `schema.sql` | DDL canônico e dicionário de dados completo: 9 tabelas, tipos ENUM (listas de valores fixos), gatilhos de retenção, de MFA e de imutabilidade da auditoria. |
| `seed.sql` | Carga de demonstração que exercita as regras de negócio — o fluxo 1:N de evidência, o ciclo do dossiê, a identificação feita pela IA e cinco bloqueios que devem falhar (consolidar dossiê sem identificação, dar acesso à evidência sem MFA, retenção acima de 180 dias, promover papel com membro sem MFA, identificação de IA com autor humano). |
| `migrations/` | Esqueleto do Alembic — a ferramenta que gera e aplica migrações a partir dos modelos Python (`env.py`, `script.py.mako`, `versions/0001_baseline.py`). Ainda em branco. |
| `README.md` | Este arquivo. |

## Cuidado com o formato do `schema.sql`

Apesar da extensão `.sql`, o arquivo é um **documento Markdown**: o DDL executável vive dentro de um único bloco ` ```sql `, e o resto é o dicionário de dados. Ele não pode ser passado direto ao `psql` — é preciso extrair o bloco antes, que é exatamente o que o [`scripts/apply_schema.sh`](../scripts/apply_schema.sh) fará. O formato se justifica enquanto o arquivo também serve de documento de entrega; se em algum momento atrapalhar a automação, a saída é gerar um `schema.pure.sql` derivado no build, em vez de duplicar o DDL à mão.

## Duas trilhas de migração (e por que são separadas)

- **`/migrations` na raiz** — migrações **SQL manuais**, escritas à mão, aplicadas em ordem de data sobre o baseline. É onde estão as mudanças já feitas (correção do bypass de MFA, origem da identificação HUMAN/AI). Ver [`migrations/README.md`](../migrations/README.md).
- **`database/migrations/`** — esqueleto do **Alembic**, reservado para quando os models SQLAlchemy do backend saírem do estado de placeholder e passarem a gerar migrações automáticas.

Enquanto o backend não tiver models reais, a trilha manual é a que vale. Quando o Alembic entrar, o `0001_baseline.py` deve representar o estado do banco **já com as migrações manuais aplicadas**, para as duas trilhas não se atropelarem.

## O que ainda entra aqui

- `versions/` populado pelo Alembic, um arquivo por mudança incremental.
- Views de apoio aos relatórios de conformidade, se o dashboard precisar de agregações que não valem a pena montar na aplicação.

## Como aplicar

```bash
# Banco novo: baseline + todas as migrações
bash scripts/apply_schema.sh

# Banco novo, com a demo carregada
bash scripts/apply_schema.sh --with-seed

# Banco já existente: só as migrações (o baseline roda uma vez só)
bash scripts/apply_schema.sh --migrations-only
```

> O `seed.sql` é idempotente para os dados transacionais da demo, mas continua sendo carga de **desenvolvimento**. Não rode em ambiente com dado real.

## O seed como teste de aceitação

O `seed.sql` não só popula o banco: ele tenta **cinco operações que devem ser rejeitadas** e reporta o resultado de cada uma.

| Bloqueio | O que tenta | Guarda que deve barrar |
|---|---|---|
| 1 | Consolidar dossiê sem identificação no evento | `trg_dossier_consolidation_guard` |
| 2 | Dar papel com acesso à evidência a usuário sem MFA | `require_mfa_evidence_role` |
| 3 | Gravar evidência com retenção acima de 180 dias | `chk_retention_max` |
| 4 | Promover papel a `can_view_evidence` com membro sem MFA | `prevent_evidence_grant_without_mfa` |
| 5 | Identificação de origem `AI` com autor humano preenchido | `chk_identification_source` |

Saída esperada: cinco linhas `OK (esperado)`. Qualquer `FALHA DO TESTE` significa que uma proteção sumiu do schema — e é exatamente isso que a CI ([`database-ci.yml`](../.github/workflows/database-ci.yml)) transforma em build quebrado.

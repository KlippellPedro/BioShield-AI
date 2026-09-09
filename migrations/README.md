# migrations — Evolução do banco de dados

> **Siglas desta pasta.** **SQL** — *Structured Query Language*, a linguagem do banco. **DDL** — a parte do SQL que define a estrutura (tabelas, tipos, restrições). **MFA** — Autenticação Multifator. **RNF-19** — o Requisito Não Funcional que exige MFA para acesso à evidência. **ADR** — *Architecture Decision Record*, o registro de decisão de arquitetura. **CI** — Integração Contínua. **idempotente** — que pode ser aplicado várias vezes com o mesmo resultado, sem erro nem efeito duplicado. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

Histórico versionado das mudanças no schema `vigilis` (PostgreSQL), escritas à mão em SQL. **Responsável:** Pedro (Backend / Segurança / DB).

## Baseline

[`database/schema.sql`](../database/schema.sql) é o DDL canônico da **v1.3** mais o dicionário de dados, e é o ponto de partida do banco. As migrações abaixo evoluem a partir dele, na ordem em que aparecem.

> **O baseline é o estado atual, não um marco histórico.** O `schema.sql` já incorpora todas as migrações abaixo — um banco criado a partir dele nasce completo. As migrações continuam aqui porque são o caminho de atualização de bancos **já existentes**, e porque documentam *por que* cada mudança foi feita.
>
> Atenção à assimetria: o **baseline roda uma vez só** (os `CREATE TYPE`/`CREATE TABLE` não têm guarda e falham se o schema já existir); as **migrações são idempotentes** e podem ser reaplicadas. Para atualizar um banco existente, use `scripts/apply_schema.sh --migrations-only`.

## Migrações aplicadas

| Data | Arquivo | Descrição |
|---|---|---|
| 2026-06-18 | [`2026-06-18_fix-mfa-bypass.sql`](2026-06-18_fix-mfa-bypass.sql) | Correção de segurança (RNF-19). Trigger `BEFORE UPDATE` em `users` que bloqueia desativar `mfa_enabled` de TRUE para FALSE enquanto o usuário mantiver papel com `can_view_evidence`. Fecha o bypass de desativação manual do MFA por quem já tinha acesso à evidência, e complementa o `require_mfa_evidence_role`. |
| 2026-06-18 | [`2026-06-18_identification-source.sql`](2026-06-18_identification-source.sql) | Origem da identificação (ADR-010). Cria o tipo `identification_source` com os valores HUMAN e AI, adiciona `identifications.source` com default HUMAN — o que rotula corretamente as linhas legadas —, torna `identified_by` opcional e impõe a constraint `chk_identification_source`: HUMAN exige autor humano, AI exige autor nulo. É o que permite o face match gravar identificação sem inventar um usuário fictício. |
| 2026-09-09 | [`2026-09-09_fix-role-privilege-escalation.sql`](2026-09-09_fix-role-privilege-escalation.sql) | **Correção de segurança (RNF-19).** Fecha a brecha-irmã registrada na ADR-005: trigger `BEFORE UPDATE` em `roles` que barra promover `can_view_evidence` de FALSE para TRUE enquanto o papel tiver membros sem MFA. Sem ele, um único UPDATE numa linha de `roles` dava acesso à evidência a N usuários de uma vez, sem passar por nenhuma das duas guardas anteriores. Com esta migração, os três caminhos de mudança — usuário, vínculo e papel — estão cobertos. |

## Como aplicar

Cada migração é SQL idempotente — pode ser reaplicada sem erro nem efeito duplicado — com `SET search_path TO vigilis` no topo, o que aponta o banco para o schema certo. Aplique em ordem cronológica, sobre o baseline:

```bash
# Banco novo: baseline + todas as migrações, de uma vez.
bash scripts/apply_schema.sh

# Banco já existente: só as migrações que faltam (o baseline não é reaplicável).
bash scripts/apply_schema.sh --migrations-only

# Em dev, para carregar também o seed de demonstração:
bash scripts/apply_schema.sh --with-seed
```

O script extrai o DDL de dentro do bloco Markdown do `schema.sql`, aplica o baseline e percorre as migrações em ordem cronológica. A CI ([`database-ci.yml`](../.github/workflows/database-ci.yml)) roda exatamente essa sequência a cada push e quebra o build se alguma proteção deixar de barrar o que deveria.

## Convenções

- Nome do arquivo: `AAAA-MM-DD_descricao-curta.sql`.
- Toda migração é incremental e idempotente. Nunca recria o banco.
- `SET search_path TO vigilis;` na primeira linha.
- Migração que mexe em coluna com dado pessoal precisa dizer no cabeçalho o que acontece com os dados existentes.

## Verificação

As três guardas de MFA e a coerência da origem da identificação são exercitadas pelo `database/seed.sql`, que tenta cinco operações que **devem** falhar e imprime `FALHA DO TESTE` se alguma passar. A CI trata isso como erro de build. Rodar localmente:

```bash
bash scripts/apply_schema.sh --with-seed
```

Saída esperada: cinco linhas `OK (esperado)`, uma para cada bloqueio.

## Dívida conhecida

Nenhuma pendente nesta camada. As duas anteriores foram resolvidas em 2026-09-09:

- ~~Brecha-irmã do MFA (ADR-005)~~ — fechada pela migração `2026-09-09_fix-role-privilege-escalation.sql`.
- ~~Cabeçalho do `schema.sql` desatualizado~~ — corrigido; o arquivo agora declara v1.4, lista as migrações incorporadas e não cita mais a migração inexistente de 2026-06-17.

## Relação com `database/migrations/`

São duas trilhas com propósitos diferentes, e vale não confundir:

- **Aqui (`/migrations`)** ficam as migrações **SQL manuais**. É a trilha ativa hoje.
- **`database/migrations/`** é o esqueleto do **Alembic**, reservado para quando os models SQLAlchemy do backend saírem do estado de placeholder e passarem a gerar migrações automáticas.

Quando o Alembic entrar em uso, o baseline dele precisa representar o banco **já com estas migrações manuais aplicadas**, ou as duas trilhas vão divergir.

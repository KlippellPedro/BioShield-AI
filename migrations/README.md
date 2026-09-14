# migrations — Histórico de mudanças do banco de dados

**Em uma frase:** cada arquivo desta pasta registra uma mudança feita no banco depois da sua criação — o que mudou, por que mudou e como aplicar a mudança num banco que já estava funcionando.

É o equivalente, para o banco de dados, a um histórico de versões comentado. Para a visão geral do banco, veja [`database/README.md`](../database/README.md).

> **Siglas desta pasta.** **SQL** — a linguagem do banco. **MFA** — autenticação multifator. **RNF-19** — o requisito que exige MFA para acesso às imagens de infração. **ADR** — *Architecture Decision Record*, o registro de uma decisão de arquitetura. **idempotente** — que pode ser executado várias vezes com o mesmo resultado, sem erro nem duplicação. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

**Responsável:** Pedro Nadalon Klippel — Backend, segurança e banco de dados.

---

## Migrações aplicadas

| Data | Arquivo | O que faz e por quê |
|---|---|---|
| 2026-06-18 | [`2026-06-18_fix-mfa-bypass.sql`](2026-06-18_fix-mfa-bypass.sql) | **Correção de segurança.** Impede desligar o MFA de um usuário enquanto ele tiver perfil com acesso às imagens. Antes, bastava desativar o segundo fator depois de receber o perfil para continuar vendo as evidências sem ele. |
| 2026-06-18 | [`2026-06-18_identification-source.sql`](2026-06-18_identification-source.sql) | **Identificação feita pela IA.** Até então, toda identificação exigia um usuário humano como autor. Com o reconhecimento facial automático ([ADR-010](../docs/architecture.md)), passa a registrar a origem — `HUMAN` ou `AI` — e o autor humano vira opcional. Uma restrição mantém a coerência: identificação humana exige autor; identificação pela IA não pode ter um. Registros antigos são marcados como `HUMAN`, que é o que eles eram. |
| 2026-09-09 | [`2026-09-09_fix-role-privilege-escalation.sql`](2026-09-09_fix-role-privilege-escalation.sql) | **Correção de segurança.** Impede liberar o acesso às imagens para um perfil que já tenha membros sem MFA. Antes, uma única alteração no perfil dava acesso a todos os seus membros de uma vez, sem passar pelas duas proteções anteriores. Com ela, a regra de MFA fica protegida pelos três caminhos possíveis: usuário, vínculo e perfil ([ADR-005](../docs/architecture.md)). |
| 2026-09-14 | [`2026-09-14_fix-audit-truncate.sql`](2026-09-14_fix-audit-truncate.sql) | **Correção de segurança.** Impede esvaziar a trilha de auditoria com `TRUNCATE`. As proteções existentes eram gatilhos de linha, que atuam registro a registro e não disparam com esse comando: o `DELETE` era recusado, mas o `TRUNCATE` apagava a trilha inteira sem erro. Adiciona um gatilho de instrução, que dispara uma vez por comando ([ADR-006](../docs/architecture.md)). |

---

## Como esta pasta se relaciona com o `schema.sql`

O [`database/schema.sql`](../database/schema.sql) já contém **todas** as migrações acima. Um banco criado a partir dele nasce completo, sem precisar aplicar nada desta pasta.

As migrações continuam aqui por dois motivos: são o caminho para atualizar um banco que foi criado antes dessas mudanças, e documentam o motivo de cada uma.

Há uma diferença importante entre os dois:

- **O `schema.sql` roda uma vez só**, num banco vazio. Executá-lo de novo falha, porque as tabelas e os tipos já existem.
- **As migrações são idempotentes.** Podem ser aplicadas mais de uma vez sem erro, o que é verificado automaticamente pela integração contínua.

---

## Como aplicar

Num banco novo, o caminho mais simples — que só exige Docker — está em [Como executar](../README.md#como-executar) no README principal.

Com o cliente `psql` instalado e as variáveis de conexão configuradas:

```bash
# Banco novo: cria tudo e aplica as migrações
bash scripts/apply_schema.sh

# Banco já existente: só as migrações
bash scripts/apply_schema.sh --migrations-only
```

O script aplica as migrações em ordem cronológica, pelo nome do arquivo.

---

## Como são verificadas

A integração contínua ([`database-ci.yml`](../.github/workflows/database-ci.yml)) cria o banco, aplica as migrações duas vezes seguidas — para provar que são idempotentes — e roda a demonstração do `seed.sql`, que tenta sete operações proibidas.

Cada migração de segurança tem o seu bloqueio correspondente na demonstração, de modo que remover uma proteção quebra o build:

| Migração | Bloqueio na demonstração |
|---|---|
| `2026-06-18_fix-mfa-bypass.sql` | 7 — desligar o MFA de quem tem acesso a imagens |
| `2026-06-18_identification-source.sql` | 5 — identificação feita pela IA com autor humano |
| `2026-09-09_fix-role-privilege-escalation.sql` | 4 — liberar imagens para perfil com membros sem MFA |
| `2026-09-14_fix-audit-truncate.sql` | 6 — esvaziar a trilha de auditoria com `TRUNCATE` |

Ao criar uma nova migração de segurança, acrescente o bloqueio correspondente ao `seed.sql` e atualize o número esperado (`ESPERADOS`) no `database-ci.yml`.

---

## Convenções para novas migrações

- Nome do arquivo: `AAAA-MM-DD_descricao-curta.sql`, para que a ordem alfabética seja a ordem cronológica.
- Primeira instrução: `SET search_path TO vigilis;`.
- Toda migração é incremental e idempotente, e nunca recria o banco. Use `IF NOT EXISTS`, `DROP ... IF EXISTS` e `CREATE OR REPLACE`.
- O cabeçalho explica o problema, a correção e, se a mudança mexer em coluna com dado pessoal, o que acontece com os dados já gravados.
- Ao criar uma migração, aplique a mesma mudança no `schema.sql` e registre-a no cabeçalho dele, para que o banco novo continue nascendo completo.

---

## Relação com `database/migrations/`

São duas trilhas diferentes:

- **Esta pasta** guarda migrações escritas à mão em SQL. É a trilha usada hoje.
- **`database/migrations/`** é a estrutura do Alembic, reservada para quando o backend tiver modelos em Python e passar a gerar migrações a partir deles.

Quando o Alembic entrar em uso, sua primeira migração deve partir do banco **já com estas migrações aplicadas**, para que as duas trilhas não entrem em conflito.

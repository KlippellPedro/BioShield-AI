# database — Banco de dados

**Em uma frase:** é onde o sistema guarda as áreas de risco, as infrações, as evidências, as identificações, os dossiês, os usuários e a trilha de auditoria — e onde as regras de segurança mais importantes são impostas pelo próprio banco, e não apenas pelo código da aplicação.

É a parte **já implementada e testada** do BioShield AI. Para a visão geral do sistema, veja o [README principal](../README.md).

> **Siglas desta pasta.** **SQL** — *Structured Query Language*, a linguagem do banco. **DDL** — *Data Definition Language*, a parte do SQL que cria tabelas, tipos e restrições. **MFA** — autenticação multifator. **gatilho** (*trigger*) — rotina que o banco executa sozinho antes ou depois de uma operação. **restrição** (*constraint*) — regra que o banco verifica em cada gravação e que recusa o dado inválido. **CI** — Integração Contínua. Lista completa no [glossário do projeto](../README.md#glossário-de-siglas).

---

## Por que as regras ficam no banco

A aplicação também vai validar essas regras, mas o banco é a última barreira. Uma regra que existe só no código pode ser contornada por um erro de programação, por um script de manutenção ou por alguém com acesso direto ao banco. Quando a regra está no próprio PostgreSQL, a operação inválida é recusada seja qual for a origem.

É o que acontece hoje com estas garantias:

| Garantia | Como é imposta |
|---|---|
| Quem vê imagens de infração precisa de autenticação em dois fatores | Três gatilhos, um para cada forma de contornar a regra: dar o perfil a um usuário sem MFA, desligar o MFA de quem já tem o perfil, ou liberar imagens para um perfil que já tem membros sem MFA |
| A trilha de auditoria não pode ser editada, ter registros excluídos nem ser esvaziada | Gatilhos que recusam `UPDATE`, `DELETE` e `TRUNCATE` |
| Evidências não podem ser guardadas por mais de 180 dias | Restrição `chk_retention_max`; um gatilho define 90 dias quando nenhum prazo é informado |
| Um dossiê só é consolidado com o profissional identificado | Gatilho `enforce_dossier_consolidation` |
| Toda identificação diz se veio de uma pessoa ou da IA, de forma coerente | Restrição `chk_identification_source` |

---

## Conteúdo da pasta

| Arquivo | Papel |
|---|---|
| `schema.sql` | Criação completa do banco (versão 1.4) e dicionário de dados: 9 tabelas, tipos enumerados, gatilhos e restrições, com a descrição de cada coluna. |
| `seed.sql` | Carga de demonstração com nomes fictícios. Monta cenários reais de uso e tenta sete operações proibidas, confirmando que o banco recusa cada uma. |
| `migrations/` | Estrutura do Alembic — ferramenta que gera migrações a partir do código Python —, reservada para quando o backend tiver seus modelos. Ainda vazia. |

### As tabelas

| Tabela | O que guarda |
|---|---|
| `zones` | Áreas de risco, EPIs obrigatórios e tempo de tolerância `T_remocao` |
| `events` | Cada infração detectada, do tipo A (entrada sem EPI) ou B (remoção dentro da área) |
| `visual_evidence` | Referência à imagem cifrada da infração; uma imagem serve a vários eventos do mesmo instante |
| `identifications` | Quem foi identificado, se por pessoa ou pela IA, e se houve contestação |
| `incident_dossiers` | O dossiê PDF de cada incidente, pendente ou consolidado |
| `roles`, `users`, `user_roles` | Perfis de acesso, usuários e o vínculo entre eles |
| `audit_logs` | Trilha de acessos e ações, cujos registros não podem ser editados |

O banco usa o schema técnico `vigilis` e exige PostgreSQL 14 ou superior.

---

## Um detalhe de formato: o `schema.sql` é um documento

Apesar da extensão, o `schema.sql` é um arquivo Markdown: o código SQL fica dentro de um bloco ` ```sql `, e o restante é o dicionário de dados, escrito para leitura. Por isso **ele não pode ser passado diretamente ao `psql`**. O script [`scripts/apply_schema.sh`](../scripts/README.md) extrai o bloco e o aplica.

O formato foi mantido porque o arquivo também serve como documento de entrega. Se um dia atrapalhar a automação, a saída é gerar um arquivo SQL puro a partir dele, nunca manter duas cópias à mão.

---

## Como executar

O caminho mais simples, que só exige Docker, está em [Como executar](../README.md#como-executar) no README principal.

Com o cliente `psql` instalado e as variáveis de conexão configuradas (`PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`):

```bash
bash scripts/apply_schema.sh --with-seed        # banco novo, com a demonstração
bash scripts/apply_schema.sh                    # banco novo, sem a demonstração
bash scripts/apply_schema.sh --migrations-only  # banco já existente
```

A carga de demonstração pode ser executada mais de uma vez sem duplicar dados, mas é só para desenvolvimento: não deve ser usada em ambiente com dados reais.

---

## A demonstração como teste

O `seed.sql` tenta sete operações que o banco deve recusar e informa o resultado de cada uma:

| # | Operação tentada | Proteção que recusa |
|---|---|---|
| 1 | Consolidar um dossiê sem o profissional identificado | `enforce_dossier_consolidation` |
| 2 | Dar perfil com acesso a imagens a um usuário sem MFA | `require_mfa_evidence_role` |
| 3 | Gravar uma evidência com prazo acima de 180 dias | `chk_retention_max` |
| 4 | Liberar imagens para um perfil que tem membros sem MFA | `prevent_evidence_grant_without_mfa` |
| 5 | Registrar identificação feita pela IA com autor humano | `chk_identification_source` |
| 6 | Esvaziar a trilha de auditoria com `TRUNCATE` | `block_audit_truncate` |
| 7 | Desligar o MFA de quem tem perfil com acesso a imagens | `prevent_mfa_disable_with_evidence_role` |

A saída esperada são sete linhas `OK (esperado)`. Uma linha `FALHA DO TESTE` significa que alguma proteção deixou passar o que deveria barrar — e a integração contínua ([`database-ci.yml`](../.github/workflows/database-ci.yml)) quebra o build nesse caso.

### Limites conhecidos

- **Superusuário do banco.** Gatilhos protegem contra a aplicação e contra usuários comuns, mas um superusuário do PostgreSQL pode desabilitá-los. Controlar quem tem esse acesso ao servidor é responsabilidade da infraestrutura.
- **Revogação de privilégios.** A segunda camada de proteção da trilha — retirar os privilégios de `UPDATE`, `DELETE` e `TRUNCATE` do usuário de banco da aplicação — está escrita no `schema.sql`, mas comentada, até esse usuário ser criado.

### Por que o `TRUNCATE` precisou de um gatilho próprio

Até 2026-09-14, a trilha era protegida só por gatilhos de linha, que atuam registro a registro. O `TRUNCATE` apaga a tabela inteira sem passar pelos registros, então esses gatilhos não disparavam: o `DELETE` era recusado, mas o `TRUNCATE` esvaziava a trilha sem erro. A migração [`2026-09-14_fix-audit-truncate.sql`](../migrations/2026-09-14_fix-audit-truncate.sql) adicionou um gatilho de instrução, que dispara uma vez por comando, e o bloqueio 6 garante que a brecha não volte.

---

## Duas trilhas de migração

- **[`/migrations`](../migrations/README.md), na raiz** — migrações escritas à mão em SQL. É a trilha usada hoje, com quatro migrações aplicadas.
- **`database/migrations/`** — estrutura do Alembic, para quando o backend gerar migrações a partir dos modelos Python.

Quando o Alembic entrar em uso, sua primeira migração deve representar o banco **já com as migrações manuais aplicadas**, para que as duas trilhas não entrem em conflito.

---

## O que ainda entra aqui

- Migrações do Alembic, uma por mudança.
- Uma ação de auditoria específica para o reconhecimento facial, que ainda não existe no tipo `audit_action` — ver [`backend/README.md`](../backend/README.md#pontos-de-atenção).
- Visões (*views*) para os relatórios de conformidade, se o painel precisar de agregações que não compensa calcular na aplicação.

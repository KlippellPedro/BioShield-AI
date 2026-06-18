# Decisões de Arquitetura (ADRs) — BioShield AI

Registro das decisões estruturais do projeto, no formato leve **Contexto → Decisão → Consequência**. Base normativa: SRS v1.3 (ISO/IEC 25010, IEEE 830, LGPD).

---

## ADR-001 — Monorepo com três frentes

- **Contexto:** o sistema tem três naturezas distintas — visão computacional (edge), API/regras (backend) e dashboard (web).
- **Decisão:** um único repositório (`ai_edge/`, `backend/`, `frontend/`) com responsabilidades separadas por pasta e configuração global compartilhada.
- **Consequência:** versionamento e CI unificados, refatorações atômicas entre frentes; exige disciplina de fronteiras (a comunicação edge↔backend é só via API REST).

## ADR-002 — Evidência visual 1:N eventos

- **Contexto:** quando faltam vários EPIs no mesmo instante, gera-se **um evento por EPI**, mas captura-se **um único snapshot** (minimização).
- **Decisão:** a chave fica em `events.evidence_id` (lado N); `visual_evidence` é o lado 1. Sem `UNIQUE` — vários eventos referenciam a mesma evidência (RF-16).
- **Consequência:** uma foto por instante de infração, compartilhada pelos eventos daquele instante. A FK é `NULL` até o anexo assíncrono (RNF-18).

## ADR-003 — Identificação exclusivamente humana e contestável

- **Contexto:** a IA **não** identifica ninguém (RF-15, §6.1). A passagem de "Track ID anônimo" para um nome é um ato humano (RF-17, LGPD art. 20).
- **Decisão:** a tabela `identifications` é a fonte da verdade audit-grade (quem identificou, quando, status `CONFIRMADA/CONTESTADA/REVOGADA`, cascateia com a evidência). Os campos `events.audited_professional_name/registration` são a **cópia operacional** que consolida o dossiê.
- **Consequência:** rastreabilidade e contestabilidade preservadas; exige escrever os dois no mesmo fluxo de acknowledge e mantê-los sob o mesmo expurgo.

## ADR-004 — Retenção limitada e expurgo da evidência

- **Contexto:** evidência identificável é dado pessoal (em saúde, potencialmente sensível); retenção indefinida é vedada (§6.3).
- **Decisão:** `retention_until` com **default 90 dias** (trigger) e **teto 180 dias** (constraint `chk_retention_max`). Job agendado apaga arquivos/linhas vencidos.
- **Consequência:** o expurgo precisa cobrir também os dados pessoais derivados — `SET NULL` em `events.audited_*` e remoção do `incident_dossiers` + PDF (a trilha `audit_logs` sobrevive, é imutável).

## ADR-005 — MFA obrigatório para acesso à evidência

- **Contexto:** a evidência é o único artefato identificável (RNF-19).
- **Decisão:** papéis com `can_view_evidence = TRUE` exigem `users.mfa_enabled`. Defesa em profundidade por trigger no banco; validação principal no login (app). O segredo de MFA é só uma **referência** ao cofre (`mfa_secret_ref`), nunca o segredo.
- **Consequência:** não é possível atribuir papel com acesso à evidência a usuário sem MFA.

## ADR-006 — Trilha de auditoria imutável

- **Contexto:** acessos e visualizações de evidência precisam de prova durável (RNF-14).
- **Decisão:** `audit_logs` é append-only — `UPDATE`/`DELETE` bloqueados por trigger **e** por `REVOKE` (defesa em profundidade). Alvos são referências **lógicas** (sem FK), para sobreviver ao expurgo da evidência.
- **Consequência:** um usuário com registros na trilha é, na prática, **indeletável** (a FK `ON DELETE SET NULL` colide com a imutabilidade) — o caminho correto é desativar (`is_active`/`USER_DEACTIVATE`), nunca `DELETE`.

## ADR-007 — Dossiê de incidente com ciclo PENDENTE → CONSOLIDADO

- **Contexto:** o incidente precisa de um relatório PDF, gerado já na infração, mas o nome só entra depois da validação humana.
- **Decisão:** `incident_dossiers` (1:1 com `events`). `PENDENTE` na geração; `CONSOLIDADO` só após a identificação — garantido por trigger que exige `events.audited_professional_*` preenchidos.
- **Consequência:** o PDF consolidado embute dado pessoal → cifrar em repouso e sujeitar ao mesmo expurgo da evidência.

## ADR-008 — Chaves UUID (exceto auditoria)

- **Contexto:** evitar enumeração sequencial e facilitar geração distribuída no edge.
- **Decisão:** PKs **UUID** (`gen_random_uuid()`) nas entidades de negócio; `audit_logs` usa `BIGINT IDENTITY` por ser append-only sequencial de alto volume.
- **Consequência:** identificadores não adivinháveis; auditoria com PK compacta e ordenável.

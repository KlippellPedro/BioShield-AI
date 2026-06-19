# Decisões de Arquitetura (ADRs) — BioShield AI

Registro das decisões estruturais do projeto, no formato leve **Contexto → Decisão → Consequência**. Base normativa: SRS v1.3 (ISO/IEC 25010, IEEE 830, LGPD) — **em revisão para v1.4** (ver ADR-010).

---

## ADR-001 — Monorepo com três frentes

- **Contexto:** o sistema tem três naturezas distintas — visão computacional (edge), API/regras (backend) e dashboard (web).
- **Decisão:** um único repositório (`ai_edge/`, `backend/`, `frontend/`) com responsabilidades separadas por pasta e configuração global compartilhada.
- **Consequência:** versionamento e CI unificados, refatorações atômicas entre frentes; exige disciplina de fronteiras (a comunicação edge↔backend é só via API REST).

## ADR-002 — Evidência visual 1:N eventos

- **Contexto:** quando faltam vários EPIs no mesmo instante, gera-se **um evento por EPI**, mas captura-se **um único snapshot** (minimização).
- **Decisão:** a chave fica em `events.evidence_id` (lado N); `visual_evidence` é o lado 1. Sem `UNIQUE` — vários eventos referenciam a mesma evidência (RF-16).
- **Consequência:** uma foto por instante de infração, compartilhada pelos eventos daquele instante. A FK é `NULL` até o anexo assíncrono (RNF-18).

## ADR-003 — Identificação exclusivamente humana e contestável ⚠️ SUPERADA

> **Status:** **superada em 2026-06-18 pela [ADR-010](#adr-010--identificação-automatizada-por-face-match-mudança-de-escopo).** Mantida como registro histórico da decisão original do SRS v1.3.

- **Contexto (original):** a IA não identificava ninguém (RF-15, §6.1). A passagem de "Track ID anônimo" para um nome era um ato humano (RF-17, LGPD art. 20).
- **Decisão (original):** `identifications` como fonte da verdade audit-grade da identificação **humana**; `events.audited_professional_*` como cópia operacional do dossiê.
- **Nota de supersessão:** a diretriz de negócio passou a exigir **automação total** da identificação — ver ADR-010. A **contestabilidade** (status `CONTESTADA/REVOGADA`) e o **direito de revisão humana** são **mantidos** como salvaguarda da decisão automatizada (art. 20).

## ADR-004 — Retenção limitada e expurgo da evidência

- **Contexto:** evidência identificável é dado pessoal (em saúde, potencialmente sensível); retenção indefinida é vedada (§6.3).
- **Decisão:** `retention_until` com **default 90 dias** (trigger) e **teto 180 dias** (constraint `chk_retention_max`). Job agendado apaga arquivos/linhas vencidos.
- **Consequência:** o expurgo precisa cobrir também os dados pessoais derivados — `SET NULL` em `events.audited_*`, remoção do `incident_dossiers` + PDF e do **template facial** (ADR-010). A trilha `audit_logs` sobrevive, é imutável.

## ADR-005 — MFA obrigatório para acesso à evidência

- **Contexto:** a evidência é o único artefato identificável (RNF-19).
- **Decisão:** papéis com `can_view_evidence = TRUE` exigem `users.mfa_enabled`. Defesa em profundidade por **dois triggers** no banco; validação principal no login (app). O segredo de MFA é só uma **referência** ao cofre (`mfa_secret_ref`), nunca o segredo.
- **Consequência:** dois flancos cobertos —
  - `require_mfa_evidence_role` (em `user_roles`): impede **atribuir** papel de evidência a usuário sem MFA;
  - `prevent_mfa_disable_with_evidence_role` (em `users`, migração `2026-06-18_fix-mfa-bypass.sql`): impede **desligar** o MFA (`TRUE→FALSE`) enquanto o usuário mantém papel com `can_view_evidence` — fecha o bypass de desativação manual.
  - *Brecha-irmã ainda aberta (defesa em profundidade futura):* nenhum trigger cobre flipar `roles.can_view_evidence` de `FALSE→TRUE` num papel que já tem membros sem MFA.

## ADR-006 — Trilha de auditoria imutável

- **Contexto:** acessos, visualizações de evidência e **matches faciais** precisam de prova durável (RNF-14).
- **Decisão:** `audit_logs` é append-only — `UPDATE`/`DELETE` bloqueados por trigger **e** por `REVOKE` (defesa em profundidade). Alvos são referências **lógicas** (sem FK), para sobreviver ao expurgo da evidência.
- **Consequência:** um usuário com registros na trilha é, na prática, **indeletável** (a FK `ON DELETE SET NULL` colide com a imutabilidade) — o caminho correto é desativar (`is_active`/`USER_DEACTIVATE`), nunca `DELETE`.

## ADR-007 — Dossiê de incidente com ciclo PENDENTE → CONSOLIDADO

- **Contexto:** o incidente precisa de um relatório PDF, gerado já na infração, mas o nome só entra depois da resolução da identidade.
- **Decisão:** `incident_dossiers` (1:1 com `events`). `PENDENTE` na geração; `CONSOLIDADO` após a identificação (agora **automática**, ADR-010) — garantido por trigger que exige `events.audited_professional_*` preenchidos.
- **Consequência:** o PDF consolidado embute dado pessoal → cifrar em repouso e sujeitar ao mesmo expurgo da evidência.

## ADR-008 — Chaves UUID (exceto auditoria)

- **Contexto:** evitar enumeração sequencial e facilitar geração distribuída no edge.
- **Decisão:** PKs **UUID** (`gen_random_uuid()`) nas entidades de negócio; `audit_logs` usa `BIGINT IDENTITY` por ser append-only sequencial de alto volume.
- **Consequência:** identificadores não adivinháveis; auditoria com PK compacta e ordenável.

## ADR-009 — Arquitetura Web Desacoplada com IA em cascata (dois estágios)

- **Contexto:** rejeitada a Desktop pura (deploy fácil no hospital, divisão de equipe, alertas ≤ 3 s, suporte a WebSockets). A diretriz de negócio exige **automação total** do fluxo infração → identificação → dossiê (ver ADR-010), o que pede alta precisão na confirmação e identificação sem intervenção manual.
- **Decisão:** sistema **Web desacoplado** (frontend SPA + backend Flask + edge headless), com um **pipeline de IA em cascata**:
  1. **Filtro no Edge (1ª IA — `ai_edge`):** monitora o ambiente; ao **suspeitar** de falta de EPI, captura o snapshot **identificável** e o envia ao backend.
  2. **Validação no Backend (2ª IA):** modelo mais robusto reconfirma, com precisão, se há de fato a infração de EPI.
  3. **Identificação automática (Face Match):** confirmada a infração, o backend faz **reconhecimento facial** da imagem contra o **cadastro do hospital** para resolver nome e matrícula (ADR-010).
  4. **Dossiê:** com infração + identidade resolvidas, o backend gera o **PDF nominal consolidado** e despacha para a diretoria.
- **Consequência:** o edge faz a triagem barata (baixa latência/custo) e o backend concentra o processamento pesado (2ª IA + biometria) num só lugar — auditável e mais fácil de proteger. Comunicação por REST + WebSocket/SSE; a **imagem identificável** trafega edge→backend sob **TLS**.

## ADR-010 — Identificação automatizada por Face Match (mudança de escopo)

- **Contexto:** nova diretriz de negócio (2026-06-18): **automação total** — sem o gestor no meio para nomear o infrator. O objetivo é gerar e despachar o dossiê nominal automaticamente. **Decisão tomada com ciência explícita dos impactos abaixo.**
- **Decisão:** o sistema realiza **reconhecimento facial automatizado** da evidência contra o **banco de dados de profissionais do hospital** para preencher nome/matrícula no dossiê — **substituindo** a identificação humana da [ADR-003].
- **Consequência (registrar para a banca — é onde o projeto será questionado):**
  - **Override do SRS v1.3:** contraria **RF-15, §6.1 e §1.2** (que vedavam reconhecimento facial, cruzamento com o cadastro nominal e identificação automatizada). → **versionar o SRS para v1.4** refletindo esta decisão.
  - **Dado biométrico = dado pessoal sensível** (LGPD art. 5, II; art. 11): exige **base legal específica**, **Relatório de Impacto (DPIA/RIPD)** e controles reforçados (cifra e minimização do *template* facial, segregação, descarte).
  - **Decisão automatizada (LGPD art. 20):** o titular mantém o **direito à revisão** e à **contestação**. O fluxo preserva o estado contestável (`identifications.status` CONTESTADA/REVOGADA) e uma **revisão humana** no dashboard — a automação produz o dossiê, mas ele **não é irrevisável**.
  - **Implicações no schema (follow-up, NÃO aplicado nesta etapa):** `identifications.identified_by` (hoje `NOT NULL → users`, ou seja humano) e o trigger de consolidação do dossiê (que exige `events.audited_professional_*` preenchidos por humano) precisam aceitar uma **origem SISTEMA/IA** — ex.: um usuário técnico `system`, ou uma coluna `identification_source ∈ {HUMAN, AI}`. Sinalizado aqui para um próximo passo de banco.

# BioShield AI — Banco de Dados
## Script de Criação (PostgreSQL 14+) e Dicionário de Dados

| Campo | Valor |
|---|---|
| **Produto** | BioShield AI (schema técnico permanece `vigilis`) |
| **SGBD-alvo** | PostgreSQL 14 ou superior |
| **Schema** | `vigilis` |
| **Codificação** | UTF-8 |
| **Convenções** | `snake_case`, chaves substitutas UUID (exceto `audit_logs`, ver §3) |
| **Versão SRS** | v1.3 (evidência 1:N, MFA, retenção limitada, identificação humana) |
| **Rastreabilidade SRS** | RF-04/05/13/14/16/17, RNF-05/12/13/14/18/19, §6 (LGPD) |

> Este documento reflete o estado **pós-migração v1.3**. Para um banco já existente, aplique
> `migrations/2026-06-17_srs-v1.3_evidence-identification.sql` (não recrie o banco).

---

## 1. Notas de Arquitetura de Dados

- **Chaves primárias:** UUID (`gen_random_uuid()`) nas entidades de negócio — evita enumeração sequencial e facilita geração distribuída no *edge*. Exceção: `audit_logs` usa `IDENTITY` (BIGINT) por ser *append-only* sequencial de alto volume.
- **Imutabilidade do `audit_logs`:** garantida por *triggers* que bloqueiam `UPDATE`/`DELETE` **e** por `REVOKE` de privilégios (defesa em profundidade).
- **Sobrevivência da auditoria ao expurgo:** os alvos da auditoria são referências lógicas (sem FK), para que o expurgo de evidência (retenção LGPD) **não** apague o registro de quem a acessou.
- **Latência ≤ 3 s:** sustentada por índices voltados às consultas do console em tempo real (eventos pendentes por zona/janela temporal) e à trilha de auditoria.

---

## 2. Script SQL Completo (DDL)

```sql
-- =====================================================================
-- BIOSHIELD AI :: DDL :: PostgreSQL 14+  (schema técnico: vigilis)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";          -- gen_random_uuid()

CREATE SCHEMA IF NOT EXISTS vigilis;
SET search_path TO vigilis;

-- ---------------------------------------------------------------------
-- TIPOS ENUMERADOS
-- ---------------------------------------------------------------------
CREATE TYPE event_type   AS ENUM ('TIPO_A', 'TIPO_B');
-- TIPO_A = entrada não conforme ; TIPO_B = remoção de EPI

CREATE TYPE epi_type     AS ENUM ('MASCARA', 'LUVAS', 'AVENTAL', 'TOUCA', 'PROTETOR_FACIAL');

CREATE TYPE event_status AS ENUM ('PENDENTE', 'RECONHECIDO', 'DESCARTADO');

CREATE TYPE zone_category AS ENUM ('UTI', 'CENTRO_CIRURGICO', 'ISOLAMENTO', 'EMERGENCIA', 'OUTRO');

CREATE TYPE audit_action AS ENUM (
    'LOGIN', 'LOGOUT',
    'EVENT_VIEW', 'EVENT_ACK',
    'EVIDENCE_VIEW', 'EVIDENCE_EXPORT', 'EVIDENCE_PURGE',
    'ZONE_CREATE', 'ZONE_UPDATE', 'ZONE_DELETE',
    'USER_CREATE', 'USER_UPDATE', 'USER_DEACTIVATE',
    'ROLE_ASSIGN', 'ROLE_REVOKE', 'CONFIG_UPDATE',
    -- Identificação humana sobre a evidência (RF-17 / RNF-14)
    'IDENTIFICATION_CREATE', 'IDENTIFICATION_CONTEST', 'IDENTIFICATION_REVOKE'
);

-- Ciclo de vida da identificação nominal humana (RF-17)
CREATE TYPE identification_status AS ENUM ('CONFIRMADA', 'CONTESTADA', 'REVOGADA');

-- Ciclo de vida do Dossiê Automatizado de Incidente (relatório PDF)
-- PENDENTE     = PDF gerado logo após a infração, SEM o nome do profissional.
-- CONSOLIDADO  = PDF regerado após o gestor confirmar a identidade no evento.
CREATE TYPE dossier_status AS ENUM ('PENDENTE', 'CONSOLIDADO');

-- Origem da identificação (ADR-010): humana (gestor) ou automatizada (IA / face match)
CREATE TYPE identification_source AS ENUM ('HUMAN', 'AI');

-- ---------------------------------------------------------------------
-- FUNÇÕES UTILITÁRIAS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 1. ROLES (RBAC)
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    role_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code               VARCHAR(40)  NOT NULL UNIQUE,
    name               VARCHAR(120) NOT NULL,
    description        TEXT,
    can_view_evidence  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  roles IS 'Papéis do RBAC. O acesso à evidência visual é regido por can_view_evidence.';
COMMENT ON COLUMN roles.can_view_evidence IS 'TRUE permite ao papel visualizar snapshots de evidência (RF-14).';

-- ---------------------------------------------------------------------
-- 2. USERS
-- ---------------------------------------------------------------------
CREATE TABLE users (
    user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username       VARCHAR(60)  NOT NULL UNIQUE,
    email          VARCHAR(180) NOT NULL UNIQUE,
    password_hash  TEXT         NOT NULL,                 -- hash (ex.: bcrypt/argon2); NUNCA senha em claro
    full_name      VARCHAR(180) NOT NULL,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    mfa_enabled    BOOLEAN      NOT NULL DEFAULT FALSE,    -- obrigatório p/ papéis com can_view_evidence (RNF-19)
    mfa_secret_ref VARCHAR(160),                           -- referência ao cofre/KMS; NUNCA o segredo de MFA
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

COMMENT ON COLUMN users.mfa_enabled IS 'Indica MFA ativo; obrigatório para papéis com can_view_evidence (RNF-19).';
COMMENT ON COLUMN users.mfa_secret_ref IS 'Referência ao segredo de MFA no cofre/KMS — nunca o segredo em si.';

-- ---------------------------------------------------------------------
-- 3. USER_ROLES (associação N:N)
-- ---------------------------------------------------------------------
CREATE TABLE user_roles (
    user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, role_id)
);

-- Defesa em profundidade (RNF-19): impedir atribuir papel com acesso à
-- evidência a usuário sem MFA. A validação principal ocorre no login (app).
CREATE OR REPLACE FUNCTION trg_require_mfa_for_evidence_role()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT can_view_evidence FROM roles WHERE role_id = NEW.role_id)
       AND NOT (SELECT mfa_enabled FROM users WHERE user_id = NEW.user_id) THEN
        RAISE EXCEPTION 'Papel com acesso à evidência exige MFA habilitado (RNF-19).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER require_mfa_evidence_role
    BEFORE INSERT OR UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION trg_require_mfa_for_evidence_role();

-- ---------------------------------------------------------------------
-- 4. ZONES (áreas de risco)
-- ---------------------------------------------------------------------
CREATE TABLE zones (
    zone_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code               VARCHAR(40)   NOT NULL UNIQUE,
    name               VARCHAR(160)  NOT NULL,
    category           zone_category NOT NULL DEFAULT 'OUTRO',
    t_remocao_seconds  INTEGER       NOT NULL DEFAULT 5,    -- T_remocao individual por área (RF-06)
    required_epi       epi_type[]    NOT NULL DEFAULT '{}', -- EPIs obrigatórios na zona
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_tremocao_range CHECK (t_remocao_seconds > 0 AND t_remocao_seconds <= 300)
);

CREATE TRIGGER set_updated_at_zones
    BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

COMMENT ON COLUMN zones.t_remocao_seconds IS 'Limiar T_remocao em segundos, configurável por área (SRS RF-06).';

-- ---------------------------------------------------------------------
-- 5. EVENTS (alertas do motor de regras)
-- ---------------------------------------------------------------------
CREATE TABLE events (
    event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id         UUID         NOT NULL REFERENCES zones(zone_id) ON DELETE RESTRICT,
    track_id        VARCHAR(64)  NOT NULL,                 -- ID anônimo efêmero (ex.: 'track_00427')
    event_type      event_type   NOT NULL,
    epi_type        epi_type     NOT NULL,                 -- EPI ausente (A) ou removido (B)
    occurred_at     TIMESTAMPTZ  NOT NULL,                 -- instante exato do evento (relógio do edge)
    detected_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),   -- instante de gravação no servidor
    status          event_status NOT NULL DEFAULT 'PENDENTE',
    evidence_id     UUID,                                  -- FK p/ visual_evidence (1:N); NULL até anexo assíncrono. Constraint adicionada após §6.
    -- Identificação do profissional auditado — PREENCHIDA SOMENTE pelo gestor humano,
    -- após a auditoria visual da evidência (a IA nunca preenche, RF-15). DADO PESSOAL.
    audited_professional_name         VARCHAR(150),        -- nome atribuído pelo gestor; NULL até a validação humana
    audited_professional_registration VARCHAR(30),         -- matrícula atribuída pelo gestor; NULL até a validação humana
    acknowledged_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_ack_coerente CHECK (
        status <> 'RECONHECIDO'
        OR (acknowledged_by IS NOT NULL AND acknowledged_at IS NOT NULL)
    )
);

COMMENT ON TABLE events IS
  'Alerta de infração de EPI (TIPO_A = entrada não conforme; TIPO_B = remoção), gerado pelo motor de regras sobre um Track ID ANÔNIMO. A IA NÃO identifica (RF-15): no reconhecimento (acknowledge), a gerência audita a evidência nítida (visual_evidence) e, ao reconhecer o profissional, grava nome/matrícula nos campos audited_professional_* — dados pessoais inseridos EXCLUSIVAMENTE por validação humana. Esses campos consolidam o Dossiê de Incidente (incident_dossiers) e devem ser cifrados em repouso (RNF-12) e incluídos no expurgo (ver §4). O registro audit-grade, contestável (LGPD art. 20) e atrelado à retenção da evidência permanece em identifications (RF-17).';
COMMENT ON COLUMN events.track_id IS 'Identificador anônimo e efêmero; nunca vinculado a nome ou matrícula (SRS §6.1).';
COMMENT ON COLUMN events.evidence_id IS 'FK opcional para a evidência (snapshot nítido) do instante de infração; vários eventos podem compartilhar a mesma (RF-16, 1:N). NULL até a evidência ser anexada de forma assíncrona (RNF-18).';
COMMENT ON COLUMN events.audited_professional_name IS 'Nome do profissional infrator atribuído PELA GERÊNCIA após a auditoria visual (nunca pela IA). DADO PESSOAL: cifrar em repouso (RNF-12) e expurgar junto com a evidência. NULL até a validação humana.';
COMMENT ON COLUMN events.audited_professional_registration IS 'Matrícula do profissional infrator atribuída PELA GERÊNCIA após a auditoria visual. DADO PESSOAL: cifrar em repouso (RNF-12) e expurgar junto com a evidência. NULL até a validação humana.';
COMMENT ON COLUMN events.acknowledged_by IS 'Gestor que reconheceu/tratou a notificação (RF-12) e responde pela identificação gravada nos campos audited_professional_*.';

-- ---------------------------------------------------------------------
-- 6. VISUAL_EVIDENCE (1:N — uma evidência, vários eventos do instante)
-- ---------------------------------------------------------------------
-- A evidência documenta o INSTANTE de infração, não um evento específico.
-- Quando faltam vários EPIs no mesmo instante, gera-se um evento por EPI,
-- mas UM único snapshot — vários events apontam para a mesma evidência
-- (lado N em events.evidence_id). Vale para TIPO_A e TIPO_B (RF-13, RF-16).
CREATE TABLE visual_evidence (
    evidence_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id           VARCHAR(64),              -- Track ID anônimo do instante documentado
    file_reference     TEXT NOT NULL,            -- caminho/URI do snapshot CRIPTOGRAFADO (nunca a imagem em si)
    storage_checksum   CHAR(64) NOT NULL,        -- SHA-256 do arquivo cifrado (integridade)
    encryption_key_ref VARCHAR(160) NOT NULL,    -- referência à chave no KMS/cofre (não a chave)
    captured_at        TIMESTAMPTZ NOT NULL,     -- instante da captura do snapshot
    retention_until    TIMESTAMPTZ,              -- expurgo automático; NULL -> trigger preenche 90 dias (§6.3)
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Teto de retenção: nunca além de 180 dias após a captura (minimização LGPD §6.3)
    CONSTRAINT chk_retention_max CHECK (
        retention_until IS NULL
        OR retention_until <= captured_at + INTERVAL '180 days'
    )
);

COMMENT ON TABLE visual_evidence IS
  'Referência ao snapshot NÍTIDO (sem desfoque) e cifrado do instante de infração (RF-13, TIPO_A e TIPO_B) — único artefato identificável do sistema. Finalidade: subsidiar a auditoria visual humana para que a GERÊNCIA autorizada (RBAC + MFA) identifique o profissional que violou a conformidade de EPI; a IA NÃO identifica (RF-15). A identificação resultante é registrada em identifications. Minimização: 1 quadro por instante, compartilhado por todos os eventos daquele instante/track (1:N).';
COMMENT ON COLUMN visual_evidence.file_reference IS 'Caminho/URI do snapshot NÍTIDO (sem desfoque) e CIFRADO em repouso (AES-256, RNF-12); nunca a imagem em si.';
COMMENT ON COLUMN visual_evidence.track_id IS 'Track ID anônimo do instante documentado pela evidência (rastreabilidade interna).';

-- Lado N -> 1: cada evento referencia (no máximo) uma evidência.
ALTER TABLE events
    ADD CONSTRAINT fk_events_evidence
    FOREIGN KEY (evidence_id) REFERENCES visual_evidence(evidence_id) ON DELETE SET NULL;

-- Retenção padrão: 90 dias a partir da captura, quando não informada.
CREATE OR REPLACE FUNCTION trg_default_retention()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.retention_until IS NULL THEN
        NEW.retention_until := NEW.captured_at + INTERVAL '90 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_default_retention
    BEFORE INSERT ON visual_evidence
    FOR EACH ROW EXECUTE FUNCTION trg_default_retention();

-- ---------------------------------------------------------------------
-- 7. IDENTIFICATIONS (identificação nominal humana — RF-17)
-- ---------------------------------------------------------------------
-- A identidade é atribuída por um HUMANO (gestor) OU pela IA (face match, ADR-010),
-- sempre de forma contestável. subject_reference é DADO PESSOAL: cifrar em repouso
-- e seguir a MESMA retenção da evidência (ON DELETE CASCADE).
CREATE TABLE identifications (
    identification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id       UUID NOT NULL REFERENCES visual_evidence(evidence_id) ON DELETE CASCADE,
    source            identification_source NOT NULL DEFAULT 'HUMAN', -- HUMAN (gestor) ou AI (face match, ADR-010)
    identified_by     UUID REFERENCES users(user_id) ON DELETE RESTRICT, -- obrigatório se HUMAN; NULL se AI
    subject_reference TEXT NOT NULL,                 -- identidade atribuída (nome/matrícula); DADO PESSOAL — cifrar
    justification     TEXT,
    status            identification_status NOT NULL DEFAULT 'CONFIRMADA',
    identified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    contested_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_contest_coerente CHECK (
        status <> 'CONTESTADA' OR contested_at IS NOT NULL
    ),
    -- Coerência origem <-> autor: HUMAN exige identified_by; AI exige identified_by NULL.
    CONSTRAINT chk_identification_source CHECK (
        (source = 'HUMAN' AND identified_by IS NOT NULL) OR
        (source = 'AI'    AND identified_by IS NULL)
    )
);

COMMENT ON TABLE identifications IS
  'Registro da identificação NOMINAL do profissional infrator sobre a evidência (RF-17). Origem HUMAN (gestor, após auditoria visual) ou AI (face match automático, ADR-010); em ambos permanece CONTESTÁVEL e revisável (status CONTESTADA/REVOGADA, LGPD art. 20). subject_reference é dado pessoal: cifrar em repouso. ON DELETE CASCADE → expurgada junto com o snapshot.';
COMMENT ON COLUMN identifications.source IS 'Origem da identificação: HUMAN (gestor) ou AI (face match, ADR-010). Rege a obrigatoriedade de identified_by (chk_identification_source).';
COMMENT ON COLUMN identifications.subject_reference IS 'Identidade atribuída (nome ou matrícula). DADO PESSOAL — cifrar em repouso (RNF-12) e restringir acesso.';
COMMENT ON COLUMN identifications.identified_by IS 'Gestor responsável quando source=HUMAN (RF-17); NULL quando source=AI. ON DELETE RESTRICT.';

-- ---------------------------------------------------------------------
-- 8. INCIDENT_DOSSIERS (Dossiê Automatizado de Incidente — relatório PDF)
-- ---------------------------------------------------------------------
-- Relação 1:1 com events (cada infração tem, no máximo, um dossiê). Como events
-- só armazena infrações, "apenas para violações" já é garantido pela própria tabela.
-- Ciclo: PENDENTE (PDF gerado logo após a infração, anônimo) -> CONSOLIDADO
-- (PDF regerado depois que a gerência identifica o profissional no evento).
CREATE TABLE incident_dossiers (
    dossier_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id           UUID NOT NULL UNIQUE REFERENCES events(event_id) ON DELETE RESTRICT,
    pdf_file_reference TEXT           NOT NULL,            -- caminho seguro/URI do PDF (cifrado em repouso); nunca o binário
    status             dossier_status NOT NULL DEFAULT 'PENDENTE',
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now()
);

COMMENT ON TABLE incident_dossiers IS
  'Ciclo de vida do Dossiê Automatizado de Incidente (PDF). 1:1 com events (UNIQUE + ON DELETE RESTRICT: não se apaga um evento com dossiê). O PDF CONSOLIDADO embute nome/matrícula (dados pessoais) — armazenar cifrado e sujeitar ao mesmo expurgo da evidência (§4).';
COMMENT ON COLUMN incident_dossiers.pdf_file_reference IS 'Caminho seguro/URI do PDF cifrado em repouso (RNF-12); nunca o arquivo em si.';
COMMENT ON COLUMN incident_dossiers.status IS 'PENDENTE = gerado pós-infração sem identificação; CONSOLIDADO = regerado após o gestor preencher nome/matrícula no evento (garantido por trigger).';

-- updated_at automático (reutiliza a função utilitária trg_set_updated_at()).
CREATE TRIGGER set_updated_at_dossiers
    BEFORE UPDATE ON incident_dossiers
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Integridade de consolidação: um dossiê só vira CONSOLIDADO se o evento já tiver
-- a identificação humana preenchida (nome E matrícula). Regra entre tabelas, por
-- isso uma trigger (CHECK não enxerga outra tabela).
CREATE OR REPLACE FUNCTION trg_dossier_consolidation_guard()
RETURNS TRIGGER AS $$
DECLARE
    v_name events.audited_professional_name%TYPE;
    v_reg  events.audited_professional_registration%TYPE;
BEGIN
    IF NEW.status = 'CONSOLIDADO' THEN
        SELECT audited_professional_name, audited_professional_registration
          INTO v_name, v_reg
          FROM events
         WHERE event_id = NEW.event_id;

        IF v_name IS NULL OR btrim(v_name) = ''
           OR v_reg IS NULL OR btrim(v_reg) = '' THEN
            RAISE EXCEPTION
              'Dossiê % só pode ser CONSOLIDADO após a identificação humana do evento % (audited_professional_name e audited_professional_registration preenchidos).',
              NEW.dossier_id, NEW.event_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_dossier_consolidation
    BEFORE INSERT OR UPDATE ON incident_dossiers
    FOR EACH ROW EXECUTE FUNCTION trg_dossier_consolidation_guard();

-- ---------------------------------------------------------------------
-- 9. AUDIT_LOGS (trilha imutável — LGPD)
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
    log_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action              audit_action NOT NULL,
    target_event_id     UUID,                    -- referência LÓGICA (sem FK) — sobrevive ao expurgo
    target_evidence_id  UUID,                    -- referência LÓGICA (sem FK) — preserva a prova de acesso
    ip_address          INET NOT NULL,
    user_agent          TEXT,
    details             JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_logs IS 'Trilha append-only e imutável (RNF-14). Alvos são referências lógicas para sobreviver ao expurgo de evidência.';

-- Imutabilidade por trigger (camada 1)
CREATE OR REPLACE FUNCTION trg_block_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs é imutável: UPDATE/DELETE proibidos.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_audit_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION trg_block_audit_mutation();

CREATE TRIGGER block_audit_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION trg_block_audit_mutation();

-- Imutabilidade por privilégios (camada 2 — defesa em profundidade)
-- Ajuste 'vigilis_app' ao papel real da aplicação:
-- REVOKE UPDATE, DELETE, TRUNCATE ON vigilis.audit_logs FROM PUBLIC;
-- GRANT  INSERT, SELECT          ON vigilis.audit_logs TO vigilis_app;

-- =====================================================================
-- ÍNDICES (suporte à meta de latência ≤ 3 s)
-- =====================================================================

-- EVENTS: console em tempo real (eventos pendentes por zona/janela)
CREATE INDEX idx_events_zone_time  ON events (zone_id, occurred_at DESC);
CREATE INDEX idx_events_pendentes  ON events (occurred_at DESC) WHERE status = 'PENDENTE';
CREATE INDEX idx_events_type_time  ON events (event_type, occurred_at DESC);
CREATE INDEX idx_events_track      ON events (track_id);
-- Buscar todos os eventos que compartilham uma mesma evidência (1:N)
CREATE INDEX idx_events_evidence   ON events (evidence_id) WHERE evidence_id IS NOT NULL;

-- VISUAL_EVIDENCE: rotina de expurgo por retenção
CREATE INDEX idx_evidence_retention ON visual_evidence (retention_until);

-- IDENTIFICATIONS: lookup por evidência e por autor da identificação
CREATE INDEX idx_identifications_evidence ON identifications (evidence_id);
CREATE INDEX idx_identifications_user     ON identifications (identified_by);

-- INCIDENT_DOSSIERS: fila de consolidação (busca por status, mais antigos primeiro).
-- Índice parcial enxuto: indexa só os PENDENTE, que é exatamente a fila a processar.
CREATE INDEX idx_dossiers_status ON incident_dossiers (status, created_at);
CREATE INDEX idx_dossiers_pendentes ON incident_dossiers (created_at) WHERE status = 'PENDENTE';

-- AUDIT_LOGS: consultas por usuário, evidência, ação e tempo
CREATE INDEX idx_audit_user_time    ON audit_logs (user_id, occurred_at DESC);
CREATE INDEX idx_audit_evidence     ON audit_logs (target_evidence_id) WHERE target_evidence_id IS NOT NULL;
CREATE INDEX idx_audit_action_time  ON audit_logs (action, occurred_at DESC);

-- USER_ROLES: resolução de papéis no login
CREATE INDEX idx_user_roles_role    ON user_roles (role_id);

-- =====================================================================
-- SEED: papéis padrão (perfis do SRS §2.3)
-- =====================================================================
INSERT INTO roles (code, name, description, can_view_evidence) VALUES
('OPERADOR',        'Operador de Segurança',       'Recebe e trata notificações em tempo real',                  TRUE),
('ENFERMAGEM_CHEFE','Enfermagem-chefe',            'Trata notificações e conduz a auditoria visual da evidência', TRUE),
('GESTOR_CCIH',     'Gestor de Qualidade / CCIH',  'Analisa relatórios agregados de conformidade',               FALSE),
('ADMIN_TI',        'Administrador de TI',         'Configura câmeras, zonas e parâmetros',                      FALSE),
('DPO',             'Encarregado de Dados',        'Audita conformidade LGPD e o ciclo de vida da evidência',    TRUE);
```

---

## 3. Dicionário de Dados

### 3.1 `roles` — Papéis do RBAC
| Coluna | Tipo | Chave | Nulo | Descrição |
|---|---|---|---|---|
| `role_id` | UUID | PK | Não | Identificador do papel. |
| `code` | VARCHAR(40) | UQ | Não | Código técnico único (ex.: `OPERADOR`). |
| `name` | VARCHAR(120) | — | Não | Nome legível do papel. |
| `description` | TEXT | — | Sim | Descrição da responsabilidade. |
| `can_view_evidence` | BOOLEAN | — | Não | Autoriza visualização da evidência visual (RF-14). |
| `created_at` | TIMESTAMPTZ | — | Não | Data de criação. |

### 3.2 `users` — Usuários
| Coluna | Tipo | Chave | Nulo | Descrição |
|---|---|---|---|---|
| `user_id` | UUID | PK | Não | Identificador do usuário. |
| `username` | VARCHAR(60) | UQ | Não | Login único. |
| `email` | VARCHAR(180) | UQ | Não | E-mail único. |
| `password_hash` | TEXT | — | Não | Hash da senha (bcrypt/argon2). Nunca em claro. |
| `full_name` | VARCHAR(180) | — | Não | Nome completo. |
| `is_active` | BOOLEAN | — | Não | Indica conta ativa. |
| `mfa_enabled` | BOOLEAN | — | Não | MFA ativo; obrigatório p/ papéis com `can_view_evidence` (RNF-19). |
| `mfa_secret_ref` | VARCHAR(160) | — | Sim | Referência ao segredo de MFA no cofre/KMS — nunca o segredo. |
| `last_login_at` | TIMESTAMPTZ | — | Sim | Último acesso. |
| `created_at` | TIMESTAMPTZ | — | Não | Data de criação. |
| `updated_at` | TIMESTAMPTZ | — | Não | Última atualização (via trigger). |

### 3.3 `user_roles` — Associação Usuário↔Papel
| Coluna | Tipo | Chave | Nulo | Descrição |
|---|---|---|---|---|
| `user_id` | UUID | PK, FK→users | Não | Usuário associado. |
| `role_id` | UUID | PK, FK→roles | Não | Papel atribuído. |
| `assigned_at` | TIMESTAMPTZ | — | Não | Data da atribuição. |
| `assigned_by` | UUID | FK→users | Sim | Quem concedeu o papel. |

### 3.4 `zones` — Zonas de Risco
| Coluna | Tipo | Chave | Nulo | Descrição |
|---|---|---|---|---|
| `zone_id` | UUID | PK | Não | Identificador da zona. |
| `code` | VARCHAR(40) | UQ | Não | Código único da zona. |
| `name` | VARCHAR(160) | — | Não | Nome da área (ex.: "UTI Leste"). |
| `category` | zone_category | — | Não | Categoria (UTI, centro cirúrgico, etc.). |
| `t_remocao_seconds` | INTEGER | — | Não | Limiar T_remocao individual (1–300 s). |
| `required_epi` | epi_type[] | — | Não | EPIs obrigatórios na zona. |
| `is_active` | BOOLEAN | — | Não | Zona em monitoramento ativo. |
| `created_at` | TIMESTAMPTZ | — | Não | Data de criação. |
| `updated_at` | TIMESTAMPTZ | — | Não | Última atualização (via trigger). |

### 3.5 `events` — Eventos/Alertas de Infração
Alerta gerado pelo motor de regras sobre um **Track ID anônimo** (a IA não identifica, RF-15). No reconhecimento (acknowledge), a gerência audita a evidência nítida e, ao reconhecer o profissional, grava **nome e matrícula** nos campos `audited_professional_*` — entrada **exclusivamente humana** que consolida o Dossiê de Incidente (§3.8). Esses campos são **dados pessoais**: devem ser cifrados em repouso (RNF-12) e expurgados junto com a evidência. O registro audit-grade e **contestável** (quem identificou, quando, com estado CONTESTADA/REVOGADA — LGPD art. 20) permanece em `identifications` (§3.7), que cascateia com a evidência.

| Coluna | Tipo | Chave | Nulo | Descrição |
|---|---|---|---|---|
| `event_id` | UUID | PK | Não | Identificador do evento. |
| `zone_id` | UUID | FK→zones | Não | Zona onde ocorreu. |
| `track_id` | VARCHAR(64) | — | Não | ID anônimo efêmero, sem vínculo nominal (§6.1). |
| `event_type` | event_type | — | Não | `TIPO_A` (entrada não conforme) ou `TIPO_B` (remoção). |
| `epi_type` | epi_type | — | Não | EPI ausente/removido. |
| `occurred_at` | TIMESTAMPTZ | — | Não | Instante exato do evento (edge). |
| `detected_at` | TIMESTAMPTZ | — | Não | Instante de gravação no servidor. |
| `status` | event_status | — | Não | `PENDENTE`/`RECONHECIDO`/`DESCARTADO`. |
| `evidence_id` | UUID | FK→visual_evidence | Sim | Evidência (snapshot nítido) do instante (1:N); `NULL` até anexo assíncrono; `ON DELETE SET NULL` (RF-16, RNF-18). |
| `audited_professional_name` | VARCHAR(150) | — | Sim | **Dado pessoal** — nome do infrator, gravado **só pela gerência** após a auditoria visual (a IA nunca preenche). Cifrar em repouso; expurgar com a evidência. Consolida o dossiê. |
| `audited_professional_registration` | VARCHAR(30) | — | Sim | **Dado pessoal** — matrícula do infrator, gravada **só pela gerência** após a auditoria visual. Cifrar em repouso; expurgar com a evidência. Consolida o dossiê. |
| `acknowledged_by` | UUID | FK→users | Sim | Gestor que reconheceu/tratou a notificação (RF-12) e responde pela identificação gravada nos campos `audited_professional_*`. |
| `acknowledged_at` | TIMESTAMPTZ | — | Sim | Momento do reconhecimento. |
| `created_at` | TIMESTAMPTZ | — | Não | Data de inserção. |

### 3.6 `visual_evidence` — Evidência Visual (1:N — um instante, vários eventos)
Referência ao **snapshot nítido (sem desfoque) e cifrado** do instante da infração — o único artefato identificável do sistema. **Finalidade:** subsidiar a auditoria visual humana para que a **gerência** autorizada (RBAC + MFA) identifique o profissional que violou a conformidade de EPI. A IA **não** identifica (RF-15); a identidade resultante é registrada em `identifications` (§3.7).

| Coluna | Tipo | Chave | Nulo | Descrição |
|---|---|---|---|---|
| `evidence_id` | UUID | PK | Não | Identificador da evidência. |
| `track_id` | VARCHAR(64) | — | Sim | Track ID anônimo do instante documentado. |
| `file_reference` | TEXT | — | Não | Caminho/URI do snapshot **nítido (sem desfoque)** e **cifrado** em repouso (AES-256, RNF-12); nunca a imagem em si. |
| `storage_checksum` | CHAR(64) | — | Não | SHA-256 do arquivo cifrado (integridade). |
| `encryption_key_ref` | VARCHAR(160) | — | Não | Referência à chave no KMS (não a chave). |
| `captured_at` | TIMESTAMPTZ | — | Não | Instante da captura. |
| `retention_until` | TIMESTAMPTZ | — | Sim | Limite de retenção; `NULL` → trigger preenche `captured_at + 90 dias`; teto `+ 180 dias` (`chk_retention_max`). |
| `created_at` | TIMESTAMPTZ | — | Não | Data de inserção. |

> A relação evidência→eventos é **1:N**: o lado da chave migrou para `events.evidence_id`.
> Vários eventos (um por EPI violado no mesmo instante) compartilham um único snapshot (RF-16).

### 3.7 `identifications` — Identificação Nominal (humana ou IA) (RF-17 / ADR-010)
**Registro contestável de quem cometeu a infração.** A identidade é atribuída ao instante de infração por um **humano** (gestor, após auditar a evidência) **ou pela IA** (face match automático, ADR-010). Em ambos os casos o registro traz **a origem**, **quando**, é **contestável/revisável** pelo titular (LGPD art. 20) e é **expurgado junto com a evidência** (`ON DELETE CASCADE`). Como a evidência é 1:N com os eventos, uma identificação por instante cobre todos os eventos daquele instante.

> **Relação com `events.audited_professional_*` (§3.5):** `identifications` é a **fonte da verdade** para contestação e rastreabilidade; os campos em `events` são a **cópia operacional** que alimenta a consolidação do dossiê (§3.8). Mantenha os dois coerentes no mesmo fluxo e sob o mesmo expurgo.

| Coluna | Tipo | Chave | Nulo | Descrição |
|---|---|---|---|---|
| `identification_id` | UUID | PK | Não | Identificador da identificação. |
| `evidence_id` | UUID | FK→visual_evidence | Não | Evidência identificada; `ON DELETE CASCADE` (segue a retenção da evidência). |
| `source` | identification_source | — | Não | Origem: `HUMAN` (gestor) ou `AI` (face match, ADR-010). Rege a obrigatoriedade de `identified_by`. |
| `identified_by` | UUID | FK→users | **Sim** | Gestor responsável quando `source=HUMAN`; **NULL** quando `source=AI`. `ON DELETE RESTRICT` (`chk_identification_source`). |
| `subject_reference` | TEXT | — | Não | **Dado pessoal** — identidade atribuída pela gerência (**nome ou matrícula** do profissional infrator). Cifrar em repouso (RNF-12) e restringir acesso. |
| `justification` | TEXT | — | Sim | Justificativa da identificação. |
| `status` | identification_status | — | Não | `CONFIRMADA` (confirmação explícita) / `CONTESTADA` / `REVOGADA`. |
| `identified_at` | TIMESTAMPTZ | — | Não | Momento da identificação. |
| `contested_at` | TIMESTAMPTZ | — | Sim | Momento da contestação (obrigatório se `status = CONTESTADA`). |
| `created_at` | TIMESTAMPTZ | — | Não | Data de inserção. |

### 3.8 `incident_dossiers` — Dossiê Automatizado de Incidente (PDF)
Relação **1:1** com `events` (cada infração tem no máximo um dossiê). Ciclo: **PENDENTE** (PDF gerado logo após a infração, anônimo) → **CONSOLIDADO** (PDF regerado após a gerência preencher nome/matrícula no evento; transição barrada por trigger até a identificação existir).

| Coluna | Tipo | Chave | Nulo | Descrição |
|---|---|---|---|---|
| `dossier_id` | UUID | PK | Não | Identificador do dossiê. |
| `event_id` | UUID | FK→events, UQ | Não | Evento (violação) documentado; **1:1** (`UNIQUE`), `ON DELETE RESTRICT` (não se apaga evento com dossiê). |
| `pdf_file_reference` | TEXT | — | Não | Caminho seguro/URI do PDF **cifrado** em repouso (RNF-12); nunca o binário. |
| `status` | dossier_status | — | Não | `PENDENTE` (sem identificação) / `CONSOLIDADO` (após a identificação — humana ou IA; trigger exige `audited_professional_name` e `_registration` preenchidos no evento). |
| `created_at` | TIMESTAMPTZ | — | Não | Geração do dossiê. |
| `updated_at` | TIMESTAMPTZ | — | Não | Última alteração/regeração do arquivo (via trigger). |

### 3.9 `audit_logs` — Trilha Imutável
| Coluna | Tipo | Chave | Nulo | Descrição |
|---|---|---|---|---|
| `log_id` | BIGINT | PK (IDENTITY) | Não | Sequencial do registro. |
| `user_id` | UUID | FK→users | Sim | Autor da ação (nulo em ações de sistema). |
| `action` | audit_action | — | Não | Ação realizada (ex.: `EVIDENCE_VIEW`, `IDENTIFICATION_CREATE`/`_CONTEST`/`_REVOKE`). |
| `target_event_id` | UUID | ref. lógica | Sim | Evento alvo (sem FK, sobrevive a expurgo). |
| `target_evidence_id` | UUID | ref. lógica | Sim | Evidência alvo (sem FK, preserva a prova). |
| `ip_address` | INET | — | Não | IP de origem da ação. |
| `user_agent` | TEXT | — | Sim | Cliente/navegador. |
| `details` | JSONB | — | Não | Contexto adicional (estado denormalizado). |
| `occurred_at` | TIMESTAMPTZ | — | Não | Carimbo de tempo da ação. |

---

## 4. Recomendações de Escala e Conformidade

- **Particionamento por tempo:** em operação 24/7, recomenda-se converter `events` e `audit_logs` em tabelas **particionadas por RANGE em `occurred_at`** (ex.: partições mensais). Isso mantém os índices enxutos, acelera consultas recentes (a maioria do tráfego do console) e torna o expurgo de partições antigas uma operação de metadados (`DROP PARTITION`), e não um `DELETE` massivo.
- **Expurgo da evidência:** uma rotina agendada (`pg_cron` ou job externo) deve apagar fisicamente os arquivos cujo `retention_until < now()` e registrar `EVIDENCE_PURGE` no `audit_logs` — o registro de auditoria permanece mesmo após o arquivo sumir.
- **Expurgo dos dados pessoais derivados (importante):** ao expurgar uma evidência, o mesmo job deve, no mesmo escopo de retenção, (a) **limpar** `events.audited_professional_name` e `events.audited_professional_registration` (`SET NULL`), e (b) **apagar o PDF e a linha de `incident_dossiers`** correspondente. Como `events` não é expurgado com a evidência e o dossiê tem `ON DELETE RESTRICT`, esses dados pessoais **não somem sozinhos** — sem essa rotina, nome/matrícula e o dossiê consolidado sobreviveriam à foto que os justificava, violando a minimização (§6.3 do SRS). Cifre os campos `audited_*` e o PDF em repouso (RNF-12).
- **Coerência identificação ↔ dossiê:** o preenchimento de `audited_professional_*` (no acknowledge), a regeração do PDF para `CONSOLIDADO` e o registro em `identifications` devem ocorrer na **mesma transação** de aplicação, para não consolidar um dossiê sem o registro contestável correspondente. Considere ações de auditoria dedicadas (ex.: `DOSSIER_CONSOLIDATE`) se a trilha precisar distinguir esse passo.
- **`can_view_evidence` do DPO:** marcado como `TRUE` para auditoria, mas é decisão de política institucional — se o princípio de minimização exigir que o DPO veja apenas metadados/trilha (não as imagens), basta alterar para `FALSE`.
- **Coerência do relógio:** `occurred_at` vem do *edge*; sincronize os nós por NTP para que a latência fim-a-fim (`detected_at − occurred_at`) seja mensurável e o SLA de ≤ 3 s, auditável.
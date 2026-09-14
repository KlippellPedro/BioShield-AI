-- =====================================================================
-- BIOSHIELD AI :: SEED DE TESTE / DEMONSTRAÇÃO  (schema: vigilis)
-- ---------------------------------------------------------------------
-- Pré-requisito: rodar antes o schema.sql (estrutura + seed de papéis).
-- Objetivo: exercitar as regras de negócio e provar as restrições:
--   • Fluxo 1:N — vários eventos do mesmo instante compartilham 1 evidência.
--   • Fluxo do Dossiê — PENDENTE -> (identificação) -> CONSOLIDADO.
--   • Identificação audit-grade e contestável em identifications.
--   • Identificação de origem AI (face match, ADR-010) sem autor humano.
--   • BLOQUEIO 1: consolidar dossiê sem identificação no evento.
--   • BLOQUEIO 2: dar papel com acesso à evidência a usuário sem MFA.
--   • BLOQUEIO 3: retenção de evidência acima do teto de 180 dias.
--   • BLOQUEIO 4: promover papel a can_view_evidence com membro sem MFA.
--   • BLOQUEIO 5: identificação AI com autor humano preenchido (incoerente).
--   • BLOQUEIO 6: esvaziar a trilha de auditoria com TRUNCATE.
--   • Default de retenção (90 dias) preenchido por trigger.
--
-- Idempotente: a seção 0 limpa os dados TRANSACIONAIS desta demo (dossiês,
-- eventos, evidência — UUIDs fixos); os dados de REFERÊNCIA (usuários, zona,
-- papel) entram com ON CONFLICT DO NOTHING. Pode rodar várias vezes.
-- NÃO apagamos usuários de propósito: quem tem registro em audit_logs é
-- indeletável — a FK ON DELETE SET NULL esbarraria na imutabilidade da trilha
-- (RNF-14); o caminho correto para "remover" um usuário é desativá-lo
-- (is_active = FALSE / USER_DEACTIVATE), nunca DELETE. audit_logs é append-only,
-- então as linhas de auditoria acumulam entre execuções (comportamento esperado).
-- =====================================================================
SET search_path TO vigilis;

-- ---------------------------------------------------------------------
-- 0. LIMPEZA DOS DADOS DESTA DEMO (ordem respeita as FKs/RESTRICT)
-- ---------------------------------------------------------------------
DELETE FROM incident_dossiers
 WHERE event_id IN ('d0000000-0000-0000-0000-000000000001',
                    'd0000000-0000-0000-0000-000000000002',
                    'd0000000-0000-0000-0000-000000000003');
DELETE FROM events
 WHERE event_id IN ('d0000000-0000-0000-0000-000000000001',
                    'd0000000-0000-0000-0000-000000000002',
                    'd0000000-0000-0000-0000-000000000003');
-- Apagar a evidência cascateia identifications (ON DELETE CASCADE).
DELETE FROM visual_evidence
 WHERE evidence_id IN ('c0000000-0000-0000-0000-000000000001',
                       'c0000000-0000-0000-0000-000000000002');
-- usuários, zona e papéis são dados de REFERÊNCIA: não apagados (ver cabeçalho).

-- ---------------------------------------------------------------------
-- 1. USUÁRIOS
--    1a) Gestora COM MFA -> pode receber papel que vê evidência.
--    1b) Operador SEM MFA -> usado para provar o bloqueio (RNF-19).
-- ---------------------------------------------------------------------
INSERT INTO users (user_id, username, email, password_hash, full_name, mfa_enabled, mfa_secret_ref) VALUES
('a0000000-0000-0000-0000-000000000001', 'ana.chefe', 'ana.chefe@hospital.exemplo',
 '$argon2id$v=19$m=65536,t=3,p=4$PLACEHOLDER_HASH', 'Ana — Enfermagem-chefe', TRUE,  'vault://kms/mfa/ana'),
('a0000000-0000-0000-0000-000000000002', 'bruno.op', 'bruno.op@hospital.exemplo',
 '$argon2id$v=19$m=65536,t=3,p=4$PLACEHOLDER_HASH', 'Bruno — Operador (sem MFA)', FALSE, NULL)
ON CONFLICT DO NOTHING;

-- Gestora recebe ENFERMAGEM_CHEFE (can_view_evidence = TRUE) -> passa, pois tem MFA.
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000000-0000-0000-0000-000000000001', role_id FROM roles WHERE code = 'ENFERMAGEM_CHEFE'
ON CONFLICT DO NOTHING;

-- Operador sem MFA recebe GESTOR_CCIH (can_view_evidence = FALSE) -> passa, pois
-- o papel não dá acesso à evidência. Prepara o BLOQUEIO 4: com ele dentro, o papel
-- não pode mais ser promovido a can_view_evidence.
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000000-0000-0000-0000-000000000002', role_id FROM roles WHERE code = 'GESTOR_CCIH'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. ZONA DE RISCO (UTI) com EPIs obrigatórios e T_remocao
-- ---------------------------------------------------------------------
INSERT INTO zones (zone_id, code, name, category, t_remocao_seconds, required_epi) VALUES
('b0000000-0000-0000-0000-000000000001', 'UTI-LESTE', 'UTI Leste', 'UTI', 5,
 ARRAY['MASCARA','AVENTAL','LUVAS']::epi_type[])
ON CONFLICT DO NOTHING;

-- =====================================================================
-- CENÁRIO A — Remoção de máscara (TIPO_B): evento -> dossiê -> consolidação
-- =====================================================================

-- 3A. Evidência do instante (snapshot nítido). retention_until OMITIDA
--     de propósito -> a trigger set_default_retention preenche 90 dias.
INSERT INTO visual_evidence
    (evidence_id, track_id, file_reference, storage_checksum, encryption_key_ref, captured_at) VALUES
('c0000000-0000-0000-0000-000000000001', 'track_00427',
 's3://evidencias-cifradas/2026/06/track_00427_t1.enc',
 repeat('a',64), 'vault://kms/evidencia/key-001', now());

-- 4A. Evento de remoção (TIPO_B, MÁSCARA) já apontando para a evidência.
INSERT INTO events
    (event_id, zone_id, track_id, event_type, epi_type, occurred_at, evidence_id) VALUES
('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 'track_00427', 'TIPO_B', 'MASCARA', now(), 'c0000000-0000-0000-0000-000000000001');

-- 5A. Dossiê gerado logo após a infração -> nasce PENDENTE (sem identificação).
INSERT INTO incident_dossiers (dossier_id, event_id, pdf_file_reference) VALUES
('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 's3://dossies/2026/06/incidente_d0001_pendente.pdf');

-- ---------------------------------------------------------------------
-- BLOQUEIO 1 — tentar CONSOLIDAR sem identificação no evento (deve falhar).
-- ---------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        UPDATE incident_dossiers SET status = 'CONSOLIDADO'
         WHERE dossier_id = 'e0000000-0000-0000-0000-000000000001';
        RAISE WARNING 'FALHA DO TESTE: dossiê consolidou SEM identificação (trigger não barrou).';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'OK (esperado) — consolidação bloqueada sem identificação: %', SQLERRM;
    END;
END $$;

-- 6A. IDENTIFICAÇÃO HUMANA pela gestora (após auditar a evidência):
--     (i) grava nome/matrícula no evento + reconhece a notificação;
--     (ii) registra o ato audit-grade e contestável em identifications;
--     (iii) registra a visualização e a identificação na trilha imutável.
UPDATE events
   SET audited_professional_name         = 'Dr. João da Silva',
       audited_professional_registration = 'CRM-RS 123456',
       status          = 'RECONHECIDO',
       acknowledged_by = 'a0000000-0000-0000-0000-000000000001',
       acknowledged_at = now()
 WHERE event_id = 'd0000000-0000-0000-0000-000000000001';

INSERT INTO identifications
    (evidence_id, identified_by, subject_reference, justification, status) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'Dr. João da Silva / CRM-RS 123456',
 'Reconhecido pela enfermagem-chefe via auditoria visual do snapshot.', 'CONFIRMADA');

INSERT INTO audit_logs (user_id, action, target_event_id, target_evidence_id, ip_address, details) VALUES
('a0000000-0000-0000-0000-000000000001', 'EVIDENCE_VIEW',
 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
 '203.0.113.10', '{"motivo":"auditoria de remoção de máscara"}'),
('a0000000-0000-0000-0000-000000000001', 'IDENTIFICATION_CREATE',
 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
 '203.0.113.10', '{"subject":"Dr. João da Silva"}');

-- 7A. Agora a consolidação PASSA (evento tem nome + matrícula). PDF regerado.
UPDATE incident_dossiers
   SET status = 'CONSOLIDADO',
       pdf_file_reference = 's3://dossies/2026/06/incidente_d0001_consolidado.pdf'
 WHERE dossier_id = 'e0000000-0000-0000-0000-000000000001';

DO $$
DECLARE v_status dossier_status;
BEGIN
    SELECT status INTO v_status FROM incident_dossiers
     WHERE dossier_id = 'e0000000-0000-0000-0000-000000000001';
    IF v_status = 'CONSOLIDADO' THEN
        RAISE NOTICE 'OK — dossiê consolidado após a identificação do evento.';
    ELSE
        RAISE WARNING 'FALHA DO TESTE: dossiê não consolidou (status=%).', v_status;
    END IF;
END $$;

-- =====================================================================
-- CENÁRIO B — Entrada não conforme com MÚLTIPLOS EPIs (TIPO_A): 1:N
-- Falta máscara E avental no mesmo instante -> 2 eventos, 1 evidência.
-- =====================================================================
INSERT INTO visual_evidence
    (evidence_id, track_id, file_reference, storage_checksum, encryption_key_ref, captured_at) VALUES
('c0000000-0000-0000-0000-000000000002', 'track_00500',
 's3://evidencias-cifradas/2026/06/track_00500_t1.enc',
 repeat('b',64), 'vault://kms/evidencia/key-002', now());

INSERT INTO events
    (event_id, zone_id, track_id, event_type, epi_type, occurred_at, evidence_id) VALUES
('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
 'track_00500', 'TIPO_A', 'MASCARA', now(), 'c0000000-0000-0000-0000-000000000002'),
('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
 'track_00500', 'TIPO_A', 'AVENTAL', now(), 'c0000000-0000-0000-0000-000000000002');

DO $$
DECLARE v_n INTEGER;
BEGIN
    SELECT count(*) INTO v_n FROM events
     WHERE evidence_id = 'c0000000-0000-0000-0000-000000000002';
    IF v_n = 2 THEN
        RAISE NOTICE 'OK — 1:N comprovado: % eventos compartilham a mesma evidência.', v_n;
    ELSE
        RAISE WARNING 'FALHA DO TESTE: esperado 2 eventos na evidência, obtido %.', v_n;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- BLOQUEIO 2 — papel com acesso à evidência para usuário SEM MFA (RNF-19).
-- ---------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        INSERT INTO user_roles (user_id, role_id)
        SELECT 'a0000000-0000-0000-0000-000000000002', role_id
          FROM roles WHERE code = 'ENFERMAGEM_CHEFE';
        RAISE WARNING 'FALHA DO TESTE: papel com evidência atribuído a usuário SEM MFA.';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'OK (esperado) — atribuição bloqueada por falta de MFA: %', SQLERRM;
    END;
END $$;

-- ---------------------------------------------------------------------
-- BLOQUEIO 3 — retenção de evidência acima do teto de 180 dias (§6.3).
-- ---------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        INSERT INTO visual_evidence
            (track_id, file_reference, storage_checksum, encryption_key_ref, captured_at, retention_until)
        VALUES ('track_teto', 's3://x.enc', repeat('c',64), 'vault://kms/x',
                now(), now() + INTERVAL '200 days');
        RAISE WARNING 'FALHA DO TESTE: aceitou retenção > 180 dias.';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'OK (esperado) — retenção acima de 180 dias rejeitada: %', SQLERRM;
    END;
END $$;

-- ---------------------------------------------------------------------
-- BLOQUEIO 4 — promover papel a can_view_evidence tendo membro sem MFA (RNF-19).
-- Terceiro flanco: sem este trigger, um único UPDATE em `roles` daria acesso
-- à evidência ao Bruno (sem MFA) sem passar por nenhuma outra guarda.
-- ---------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        UPDATE roles SET can_view_evidence = TRUE WHERE code = 'GESTOR_CCIH';
        RAISE WARNING 'FALHA DO TESTE: papel promovido a acesso de evidência com membro SEM MFA.';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'OK (esperado) — promoção do papel bloqueada por membro sem MFA: %', SQLERRM;
    END;
END $$;

-- ---------------------------------------------------------------------
-- BLOQUEIO 5 — identificação de origem AI não pode ter autor humano (ADR-010).
-- A constraint chk_identification_source amarra source <-> identified_by.
-- ---------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        INSERT INTO identifications
            (evidence_id, source, identified_by, subject_reference, justification, status)
        VALUES ('c0000000-0000-0000-0000-000000000002', 'AI',
                'a0000000-0000-0000-0000-000000000001',
                'Identidade incoerente', 'Origem AI com autor humano.', 'CONFIRMADA');
        RAISE WARNING 'FALHA DO TESTE: aceitou identificação AI com autor humano.';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'OK (esperado) — identificação AI com autor humano rejeitada: %', SQLERRM;
    END;
END $$;

-- ---------------------------------------------------------------------
-- BLOQUEIO 6 — esvaziar a trilha de auditoria com TRUNCATE (RNF-14).
-- Triggers de linha não disparam com TRUNCATE; sem o trigger de instrução
-- block_audit_truncate, este comando apagaria a trilha inteira sem erro.
-- ---------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        TRUNCATE audit_logs;
        RAISE WARNING 'FALHA DO TESTE: TRUNCATE esvaziou a trilha de auditoria.';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'OK (esperado) — TRUNCATE da trilha de auditoria bloqueado: %', SQLERRM;
    END;
END $$;

-- ---------------------------------------------------------------------
-- CAMINHO FELIZ DA IA — identificação automatizada, sem autor humano (ADR-010).
-- É como o face_match_service deve gravar: source = 'AI', identified_by = NULL.
-- Permanece CONTESTÁVEL, que é a salvaguarda do art. 20 da LGPD.
-- ---------------------------------------------------------------------
INSERT INTO identifications
    (evidence_id, source, identified_by, subject_reference, justification, status)
VALUES ('c0000000-0000-0000-0000-000000000002', 'AI', NULL,
        'Dra. Marina Alves / CRM-RS 654321',
        'Face match automático contra o cadastro do hospital (confiança 0.94).', 'CONFIRMADA');

-- =====================================================================
-- VERIFICAÇÃO FINAL (saída para conferência visual)
-- =====================================================================

-- Default de retenção: evidência A deve ter retention_until = captured_at + 90 dias.
SELECT 'retencao_default_90d' AS check,
       evidence_id, captured_at, retention_until,
       (retention_until = captured_at + INTERVAL '90 days') AS bate_90_dias
  FROM visual_evidence
 WHERE evidence_id = 'c0000000-0000-0000-0000-000000000001';

-- Dossiê consolidado x identificação no evento.
SELECT 'dossie_consolidado' AS check,
       d.status, e.audited_professional_name, e.audited_professional_registration, d.pdf_file_reference
  FROM incident_dossiers d
  JOIN events e ON e.event_id = d.event_id
 WHERE d.dossier_id = 'e0000000-0000-0000-0000-000000000001';

-- 1:N — eventos por evidência (instante do track_00500).
SELECT 'evidencia_1N' AS check, evidence_id, count(*) AS qtd_eventos,
       array_agg(epi_type::text ORDER BY epi_type) AS epis
  FROM events
 WHERE evidence_id = 'c0000000-0000-0000-0000-000000000002'
 GROUP BY evidence_id;

-- Registro audit-grade da identificação (contestável), nas duas origens possíveis.
-- HUMAN traz autor preenchido; AI traz autor NULL. Ambas continuam contestáveis.
SELECT 'identificacao' AS check, source, identified_by, subject_reference, status, identified_at
  FROM identifications
 WHERE evidence_id IN ('c0000000-0000-0000-0000-000000000001',
                       'c0000000-0000-0000-0000-000000000002')
 ORDER BY source;

-- Papel de teste continua SEM acesso à evidência (o BLOQUEIO 4 deve ter barrado).
SELECT 'papel_nao_promovido' AS check, code, can_view_evidence
  FROM roles WHERE code = 'GESTOR_CCIH';

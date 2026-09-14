-- =====================================================================
-- BioShield AI :: Migração :: Bloquear TRUNCATE na trilha de auditoria (RNF-14)
-- Arquivo: migrations/2026-09-14_fix-audit-truncate.sql  ·  schema: vigilis
-- ---------------------------------------------------------------------
-- BRECHA CORRIGIDA
-- A imutabilidade de `audit_logs` era garantida por dois triggers de LINHA
-- (block_audit_update e block_audit_delete, FOR EACH ROW). Triggers de linha
-- não disparam com TRUNCATE, que remove a tabela inteira sem visitar as
-- linhas. Resultado, confirmado em teste: DELETE era recusado, mas
-- TRUNCATE vigilis.audit_logs esvaziava a trilha sem erro.
--
-- A segunda camada prevista na ADR-006 — REVOKE de UPDATE, DELETE e
-- TRUNCATE — existe no schema.sql apenas como comentário, porque depende do
-- papel de banco da aplicação, que ainda não foi criado. Enquanto isso, nada
-- impedia o TRUNCATE.
--
-- CORREÇÃO
-- Trigger de INSTRUÇÃO (FOR EACH STATEMENT) BEFORE TRUNCATE, que dispara uma
-- vez por comando e aborta a transação. Não depende de nenhum papel de banco.
-- A função trg_block_audit_mutation passa a informar a operação recusada
-- (TG_OP), já que agora atende UPDATE, DELETE e TRUNCATE.
--
-- LIMITE CONHECIDO
-- Um superusuário do PostgreSQL ainda pode desabilitar triggers
-- (ALTER TABLE ... DISABLE TRIGGER). Isso é inerente ao SGBD e continua
-- sendo responsabilidade da gestão de acesso ao servidor de banco. Esta
-- migração fecha o caminho acessível à aplicação e a usuários comuns.
--
-- Idempotente: pode ser reaplicada (CREATE OR REPLACE + DROP TRIGGER IF EXISTS).
-- =====================================================================
SET search_path TO vigilis;

BEGIN;

-- A mesma função atende os três triggers; TG_OP diz qual operação foi barrada.
CREATE OR REPLACE FUNCTION trg_block_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs é imutável: % proibido (RNF-14).', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS block_audit_truncate ON audit_logs;

CREATE TRIGGER block_audit_truncate
    BEFORE TRUNCATE ON audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION trg_block_audit_mutation();

COMMENT ON FUNCTION trg_block_audit_mutation() IS
  'RNF-14: recusa UPDATE, DELETE (triggers de linha) e TRUNCATE (trigger de instrução) em audit_logs.';

COMMIT;

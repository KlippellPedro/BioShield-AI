-- =====================================================================
-- BioShield AI :: Migração :: Fechar bypass de MFA (RNF-19)
-- Arquivo: migrations/2026-06-18_fix-mfa-bypass.sql  ·  schema: vigilis
-- ---------------------------------------------------------------------
-- BRECHA CORRIGIDA
-- A trigger existente `require_mfa_evidence_role` (em user_roles) impede
-- ATRIBUIR um papel com can_view_evidence a um usuário sem MFA — mas NÃO
-- impede que um usuário que JÁ possui esse papel desligue o mfa_enabled
-- (mudando de TRUE para FALSE) diretamente em `users`, continuando a ter
-- acesso à evidência sem MFA ativo.
--
-- CORREÇÃO
-- Trigger BEFORE UPDATE em `users` que lança exceção e barra a transação
-- quando mfa_enabled muda de TRUE -> FALSE enquanto o usuário ainda está
-- associado, via user_roles, a QUALQUER papel com can_view_evidence = TRUE.
-- Complementa (não substitui) `require_mfa_evidence_role` (RNF-19).
--
-- Idempotente: pode ser reaplicada (CREATE OR REPLACE + DROP TRIGGER IF EXISTS).
-- =====================================================================
SET search_path TO vigilis;

BEGIN;

-- Função de guarda: a transição TRUE->FALSE é garantida pela cláusula WHEN
-- do trigger; aqui só verificamos se ainda há vínculo com papel de evidência.
CREATE OR REPLACE FUNCTION trg_prevent_mfa_disable_with_evidence_role()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM user_roles ur
          JOIN roles r ON r.role_id = ur.role_id
         WHERE ur.user_id = NEW.user_id
           AND r.can_view_evidence = TRUE
    ) THEN
        RAISE EXCEPTION
          'Não é possível desabilitar o MFA do usuário %: ele ainda possui papel com acesso à evidência (RNF-19). Revogue o papel antes de desativar o MFA.',
          NEW.user_id
          USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- (Re)cria o trigger de forma idempotente.
DROP TRIGGER IF EXISTS prevent_mfa_disable_with_evidence_role ON users;

CREATE TRIGGER prevent_mfa_disable_with_evidence_role
    BEFORE UPDATE ON users
    FOR EACH ROW
    WHEN (OLD.mfa_enabled = TRUE AND NEW.mfa_enabled = FALSE)
    EXECUTE FUNCTION trg_prevent_mfa_disable_with_evidence_role();

COMMENT ON FUNCTION trg_prevent_mfa_disable_with_evidence_role() IS
  'RNF-19: barra desativar mfa_enabled (TRUE->FALSE) enquanto o usuário mantém papel com can_view_evidence. Complementa require_mfa_evidence_role.';

COMMIT;

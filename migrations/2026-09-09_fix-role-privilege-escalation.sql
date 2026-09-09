-- =====================================================================
-- BioShield AI :: Migração :: Fechar escalada de privilégio via roles (RNF-19)
-- Arquivo: migrations/2026-09-09_fix-role-privilege-escalation.sql  ·  schema: vigilis
-- ---------------------------------------------------------------------
-- BRECHA CORRIGIDA (a "brecha-irmã" registrada na ADR-005)
-- Dois triggers já protegiam o vínculo entre MFA e acesso à evidência:
--   1) require_mfa_evidence_role (user_roles)  — impede ATRIBUIR papel com
--      can_view_evidence a usuário sem MFA;
--   2) prevent_mfa_disable_with_evidence_role (users) — impede DESLIGAR o MFA
--      de quem já tem esse papel.
-- Faltava o terceiro caminho: alterar o PAPEL em vez do usuário ou do vínculo.
-- Bastava virar `roles.can_view_evidence` de FALSE para TRUE num papel que já
-- tivesse membros sem MFA para que todos eles ganhassem acesso à evidência sem
-- nunca passar pelas duas guardas acima. Um UPDATE numa linha de `roles`
-- concedia acesso a dado pessoal identificável para N usuários de uma vez.
--
-- CORREÇÃO
-- Trigger BEFORE UPDATE em `roles` que barra a transição FALSE -> TRUE de
-- can_view_evidence enquanto existir QUALQUER membro do papel sem mfa_enabled.
-- O caminho correto passa a ser: habilitar o MFA dos membros (ou desvinculá-los)
-- ANTES de promover o papel.
--
-- POR QUE CONTA MEMBROS INATIVOS TAMBÉM
-- A checagem não filtra por `users.is_active`. Exemptar inativos reabriria a
-- brecha por outro caminho — bastaria reativar a conta depois da promoção do
-- papel, e seria preciso um QUARTO trigger em users.is_active para cobrir isso.
-- Promover um papel a acesso de evidência é operação rara e de alto privilégio;
-- ser estrito aqui custa pouco e encerra a família de brechas.
--
-- INVARIANTE RESULTANTE
-- Com os três triggers, o banco passa a garantir, sem exceção:
--   "todo usuário vinculado a papel com can_view_evidence = TRUE
--    tem mfa_enabled = TRUE"
-- independentemente de a mudança vir pelo usuário, pelo vínculo ou pelo papel.
--
-- Idempotente: pode ser reaplicada (CREATE OR REPLACE + DROP TRIGGER IF EXISTS).
-- =====================================================================
SET search_path TO vigilis;

BEGIN;

-- Função de guarda: a transição FALSE->TRUE é garantida pela cláusula WHEN do
-- trigger; aqui só verificamos se o papel tem membros sem MFA.
CREATE OR REPLACE FUNCTION trg_prevent_evidence_grant_without_mfa()
RETURNS TRIGGER AS $$
DECLARE
    v_sem_mfa INTEGER;
BEGIN
    SELECT count(*) INTO v_sem_mfa
      FROM user_roles ur
      JOIN users u ON u.user_id = ur.user_id
     WHERE ur.role_id = NEW.role_id
       AND u.mfa_enabled = FALSE;

    IF v_sem_mfa > 0 THEN
        RAISE EXCEPTION
          'Não é possível conceder acesso à evidência ao papel "%": ele possui % membro(s) sem MFA habilitado (RNF-19). Habilite o MFA desses usuários ou revogue o vínculo antes de promover o papel.',
          NEW.code, v_sem_mfa
          USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- (Re)cria o trigger de forma idempotente.
DROP TRIGGER IF EXISTS prevent_evidence_grant_without_mfa ON roles;

CREATE TRIGGER prevent_evidence_grant_without_mfa
    BEFORE UPDATE ON roles
    FOR EACH ROW
    WHEN (OLD.can_view_evidence = FALSE AND NEW.can_view_evidence = TRUE)
    EXECUTE FUNCTION trg_prevent_evidence_grant_without_mfa();

COMMENT ON FUNCTION trg_prevent_evidence_grant_without_mfa() IS
  'RNF-19: barra promover can_view_evidence (FALSE->TRUE) num papel que ainda tem membros sem MFA. Terceiro e último flanco, ao lado de require_mfa_evidence_role e prevent_mfa_disable_with_evidence_role.';

COMMENT ON COLUMN roles.can_view_evidence IS
  'TRUE permite ao papel visualizar snapshots de evidência (RF-14). Só pode ser promovido de FALSE para TRUE se todos os membros do papel tiverem MFA habilitado (RNF-19, trigger prevent_evidence_grant_without_mfa).';

COMMIT;

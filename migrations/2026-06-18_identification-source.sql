-- =====================================================================
-- BioShield AI :: Migração :: Origem da identificação (HUMAN | AI)
-- Arquivo: migrations/2026-06-18_identification-source.sql  ·  schema: vigilis
-- ---------------------------------------------------------------------
-- MOTIVO (ADR-010)
-- Com a identificação agora AUTOMATIZADA (face match), a identidade pode ter
-- origem HUMANA (gestor) ou pela própria IA (SISTEMA). Antes, a coluna
-- `identifications.identified_by` era NOT NULL -> users, ou seja, exigia sempre
-- um humano. Esta migração:
--   1) cria o tipo `identification_source` ('HUMAN', 'AI');
--   2) adiciona a coluna `source` (default HUMAN — rotula corretamente as linhas
--      legadas, que vieram do fluxo humano original);
--   3) torna `identified_by` OPCIONAL (a IA não tem usuário humano);
--   4) impõe coerência: HUMAN exige `identified_by`; AI exige `identified_by` NULL.
--
-- Idempotente o suficiente p/ ambiente de dev: tipo/coluna/constraint só são
-- criados se ainda não existirem (guardas com DO/IF NOT EXISTS).
-- OBS.: o trigger de consolidação do dossiê NÃO muda — ele valida apenas que
-- `events.audited_professional_*` estão preenchidos, indiferente a quem preencheu.
-- =====================================================================
SET search_path TO vigilis;

BEGIN;

-- 1) Novo tipo de origem da identificação (idempotente).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'identification_source' AND n.nspname = 'vigilis'
    ) THEN
        CREATE TYPE identification_source AS ENUM ('HUMAN', 'AI');
    END IF;
END $$;

-- 2) Coluna de origem. Default HUMAN rotula corretamente as linhas existentes.
ALTER TABLE identifications
    ADD COLUMN IF NOT EXISTS source identification_source NOT NULL DEFAULT 'HUMAN';

-- 3) identified_by deixa de ser obrigatório (a IA não tem usuário humano).
ALTER TABLE identifications
    ALTER COLUMN identified_by DROP NOT NULL;

-- 4) Coerência origem <-> autor:
--    HUMAN  -> exige identified_by
--    AI     -> identified_by deve ser NULL
ALTER TABLE identifications
    DROP CONSTRAINT IF EXISTS chk_identification_source;
ALTER TABLE identifications
    ADD CONSTRAINT chk_identification_source CHECK (
        (source = 'HUMAN' AND identified_by IS NOT NULL) OR
        (source = 'AI'    AND identified_by IS NULL)
    );

-- 5) Comentários atualizados.
COMMENT ON COLUMN identifications.source IS
  'Origem da identificação: HUMAN (gestor) ou AI (face match automático, ADR-010). Determina a obrigatoriedade de identified_by (chk_identification_source).';
COMMENT ON COLUMN identifications.identified_by IS
  'Gestor responsável quando source=HUMAN (RF-17). NULL quando source=AI (identificação automatizada). ON DELETE RESTRICT.';
COMMENT ON TABLE identifications IS
  'Registro da identificação NOMINAL do profissional infrator sobre a evidência (RF-17). Origem HUMAN (gestor) ou AI (face match, ADR-010); em ambos os casos permanece CONTESTÁVEL e revisável (status, LGPD art. 20). subject_reference é dado pessoal: cifrar em repouso. ON DELETE CASCADE → expurgada junto com o snapshot.';

COMMIT;

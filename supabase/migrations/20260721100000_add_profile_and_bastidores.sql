-- ============================================================
-- ADICIONAR CAMPOS NA TABELA USUARIOS
-- ============================================================
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS profile_bg_url text;

-- Limitar bio a 200 caracteres
ALTER TABLE usuarios ADD CONSTRAINT check_bio_length
  CHECK (char_length(bio) <= 200);

-- ============================================================
-- TORNAR PERSONAGENS_SALVOS LEGÍVEIS POR QUALQUER AUTENTICADO
-- (necessário para visualizar bastidores de outros usuários)
-- ============================================================
DROP POLICY IF EXISTS "select_own_personagens_salvos" ON personagens_salvos;
CREATE POLICY "select_own_personagens_salvos" ON personagens_salvos FOR SELECT
  TO authenticated USING (true);

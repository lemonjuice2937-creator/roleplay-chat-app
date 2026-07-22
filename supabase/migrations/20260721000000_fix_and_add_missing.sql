-- ============================================================
-- FIX: Recriar policy de collaboratio que já existe parcialmente
-- ============================================================
DROP POLICY IF EXISTS "update_chat_partners" ON papeis;

CREATE POLICY "update_chat_partners" ON papeis FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chats c
      WHERE (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
      AND (c.user1_id = papeis.user_id OR c.user2_id = papeis.user_id)
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chats c
      WHERE (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
      AND (c.user1_id = papeis.user_id OR c.user2_id = papeis.user_id)
    )
  );

-- ============================================================
-- FIX: Adicionar coluna descricao na tabela papeis
-- ============================================================
ALTER TABLE papeis ADD COLUMN IF NOT EXISTS descricao text;

-- ============================================================
-- FIX: Adicionar coluna read_at na tabela mensagens
-- ============================================================
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- ============================================================
-- TABELA: referencias
-- ============================================================
CREATE TABLE IF NOT EXISTS referencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  imagem_url text NOT NULL,
  nome text,
  descricao text,
  role_id uuid REFERENCES papeis(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_referencias" ON referencias;
CREATE POLICY "select_own_referencias" ON referencias FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_referencias" ON referencias;
CREATE POLICY "insert_own_referencias" ON referencias FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_referencias" ON referencias;
CREATE POLICY "update_own_referencias" ON referencias FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_referencias" ON referencias;
CREATE POLICY "delete_own_referencias" ON referencias FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_referencias_user ON referencias(user_id);
CREATE INDEX IF NOT EXISTS idx_referencias_role ON referencias(role_id);

-- ============================================================
-- TABELA: vestuario
-- ============================================================
CREATE TABLE IF NOT EXISTS vestuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  imagem_url text NOT NULL,
  nome text,
  descricao text,
  role_id uuid REFERENCES papeis(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vestuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_vestuario" ON vestuario;
CREATE POLICY "select_own_vestuario" ON vestuario FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_vestuario" ON vestuario;
CREATE POLICY "insert_own_vestuario" ON vestuario FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_vestuario" ON vestuario;
CREATE POLICY "update_own_vestuario" ON vestuario FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_vestuario" ON vestuario;
CREATE POLICY "delete_own_vestuario" ON vestuario FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vestuario_user ON vestuario(user_id);
CREATE INDEX IF NOT EXISTS idx_vestuario_role ON vestuario(role_id);

-- ============================================================
-- TABELA: skills
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  role_id uuid REFERENCES papeis(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_skills" ON skills;
CREATE POLICY "select_own_skills" ON skills FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_skills" ON skills;
CREATE POLICY "insert_own_skills" ON skills FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_skills" ON skills;
CREATE POLICY "update_own_skills" ON skills FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_skills" ON skills;
CREATE POLICY "delete_own_skills" ON skills FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_skills_user ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_role ON skills(role_id);

-- ============================================================
-- TABELA: personagens_salvos
-- ============================================================
CREATE TABLE IF NOT EXISTS personagens_salvos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome text NOT NULL,
  dados jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE personagens_salvos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_personagens_salvos" ON personagens_salvos;
CREATE POLICY "select_own_personagens_salvos" ON personagens_salvos FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_personagens_salvos" ON personagens_salvos;
CREATE POLICY "insert_own_personagens_salvos" ON personagens_salvos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_personagens_salvos" ON personagens_salvos;
CREATE POLICY "update_own_personagens_salvos" ON personagens_salvos FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_personagens_salvos" ON personagens_salvos;
CREATE POLICY "delete_own_personagens_salvos" ON personagens_salvos FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_personagens_salvos_user ON personagens_salvos(user_id);

-- ============================================================
-- TABELA: pinned_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS pinned_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pinned_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pinned_notes" ON pinned_notes;
CREATE POLICY "select_own_pinned_notes" ON pinned_notes FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = pinned_notes.conversation_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_own_pinned_notes" ON pinned_notes;
CREATE POLICY "insert_own_pinned_notes" ON pinned_notes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = pinned_notes.conversation_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "delete_own_pinned_notes" ON pinned_notes;
CREATE POLICY "delete_own_pinned_notes" ON pinned_notes FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = pinned_notes.conversation_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_pinned_notes_conversation ON pinned_notes(conversation_id);

-- ============================================================
-- STORAGE BUCKETS: referencias e vestuario
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('referencias', 'referencias', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vestuario', 'vestuario', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: referencias
DROP POLICY IF EXISTS "Authenticated read access for referencias" ON storage.objects;
CREATE POLICY "Authenticated read access for referencias" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'referencias');

DROP POLICY IF EXISTS "Authenticated upload for referencias" ON storage.objects;
CREATE POLICY "Authenticated upload for referencias" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'referencias');

DROP POLICY IF EXISTS "Users can update own referencias" ON storage.objects;
CREATE POLICY "Users can update own referencias" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'referencias' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'referencias' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete own referencias" ON storage.objects;
CREATE POLICY "Users can delete own referencias" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'referencias' AND auth.uid() = owner);

-- Storage policies: vestuario
DROP POLICY IF EXISTS "Authenticated read access for vestuario" ON storage.objects;
CREATE POLICY "Authenticated read access for vestuario" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'vestuario');

DROP POLICY IF EXISTS "Authenticated upload for vestuario" ON storage.objects;
CREATE POLICY "Authenticated upload for vestuario" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vestuario');

DROP POLICY IF EXISTS "Users can update own vestuario" ON storage.objects;
CREATE POLICY "Users can update own vestuario" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vestuario' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'vestuario' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete own vestuario" ON storage.objects;
CREATE POLICY "Users can delete own vestuario" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vestuario' AND auth.uid() = owner);

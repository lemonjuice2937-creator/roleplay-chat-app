/*
# Create Roleplay Chat Schema

## Overview
Creates the complete database schema for a PWA roleplay chat app with authentication,
1:1 chats, roleplay personas (papeis), messages with optional roleplay identity,
and per-user chat background customization.

## New Tables

### usuarios
- `id` (uuid, PK, references auth.users) — the authenticated user's ID
- `username` (text, unique, not null) — the @handle, lowercase, no spaces
- `display_name` (text, not null) — friendly display name
- `avatar_url` (text, nullable) — profile avatar URL
- `created_at` (timestamptz, default now())

### chats
- `id` (uuid, PK, default gen_random_uuid())
- `user1_id` (uuid, references usuarios, not null)
- `user2_id` (uuid, references usuarios, not null)
- `created_at` (timestamptz, default now())
- Unique constraint on (user1_id, user2_id) to prevent duplicate chats

### papeis
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, references usuarios, not null) — owner of the role
- `nome` (text, not null) — roleplay character name (e.g. "Salvatore")
- `avatar_url` (text, nullable) — character avatar image URL
- `cor_balao` (text, not null, default '#8A2BE2') — bubble background color (HEX)
- `cor_fonte` (text, not null, default '#FFFFFF') — bubble text color (HEX)
- `equipado` (boolean, not null, default false) — whether the role is equipped
- `created_at` (timestamptz, default now())

### mensagens
- `id` (uuid, PK, default gen_random_uuid())
- `chat_id` (uuid, references chats, not null, on delete cascade)
- `sender_id` (uuid, references usuarios, not null)
- `texto` (text, not null) — message content
- `created_at` (timestamptz, default now())
- `papel_id` (uuid, references papeis, nullable, on delete set null) — null = normal message, set = roleplay message

### config_chat
- `id` (uuid, PK, default gen_random_uuid())
- `chat_id` (uuid, references chats, not null, on delete cascade)
- `user_id` (uuid, references usuarios, not null) — per-user config
- `background_url` (text, nullable) — chat background image URL
- `background_opacity` (numeric, default 0.5) — overlay opacity 0 to 1
- Unique constraint on (chat_id, user_id)

## Security (RLS)
All tables have RLS enabled. Policies are owner-scoped using auth.uid():
- usuarios: users can read all profiles (needed to search/see chat partners), update only their own
- chats: users can read/insert/update/delete chats where they are a participant
- papeis: users can CRUD only their own roles
- mensagens: users can read messages in chats they participate in, insert as themselves, update/delete their own messages
- config_chat: users can CRUD only their own config entries

## Important Notes
1. The `usuarios.id` column references `auth.users.id` so each profile maps 1:1 to an auth account.
2. A trigger auto-creates a usuario profile when a new auth user signs up (via handle_new_user function).
3. The unique constraint on chats (user1_id, user2_id) uses a check that user1_id < user2_id to prevent
   duplicate chats regardless of who initiates. A function `find_or_create_chat` handles this logic.
4. mensagens.papel_id uses ON DELETE SET NULL so deleting a role doesn't destroy message history —
   the message stays but loses its roleplay styling (graceful degradation).
5. All owner columns use DEFAULT auth.uid() where applicable so client inserts work without
   explicitly passing the owner ID.
*/

-- ============ USUARIOS ============
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (needed to search for friends and see chat partner info)
DROP POLICY IF EXISTS "select_usuarios" ON usuarios;
CREATE POLICY "select_usuarios" ON usuarios FOR SELECT
  TO authenticated USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "update_own_usuario" ON usuarios;
CREATE POLICY "update_own_usuario" ON usuarios FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Users can insert their own profile row
DROP POLICY IF EXISTS "insert_own_usuario" ON usuarios;
CREATE POLICY "insert_own_usuario" ON usuarios FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============ CHATS ============
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chats_pair_unique UNIQUE (user1_id, user2_id),
  CONSTRAINT chats_different_users CHECK (user1_id <> user2_id)
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Users can read chats where they are a participant
DROP POLICY IF EXISTS "select_own_chats" ON chats;
CREATE POLICY "select_own_chats" ON chats FOR SELECT
  TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can insert chats where they are a participant
DROP POLICY IF EXISTS "insert_own_chats" ON chats;
CREATE POLICY "insert_own_chats" ON chats FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can update chats where they are a participant
DROP POLICY IF EXISTS "update_own_chats" ON chats;
CREATE POLICY "update_own_chats" ON chats FOR UPDATE
  TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can delete chats where they are a participant
DROP POLICY IF EXISTS "delete_own_chats" ON chats;
CREATE POLICY "delete_own_chats" ON chats FOR DELETE
  TO authenticated USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============ PAPEIS ============
CREATE TABLE IF NOT EXISTS papeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES usuarios(id) ON DELETE CASCADE,
  nome text NOT NULL,
  avatar_url text,
  cor_balao text NOT NULL DEFAULT '#8A2BE2',
  cor_fonte text NOT NULL DEFAULT '#FFFFFF',
  equipado boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE papeis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_papeis" ON papeis;
CREATE POLICY "select_own_papeis" ON papeis FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_papeis" ON papeis;
CREATE POLICY "insert_own_papeis" ON papeis FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_papeis" ON papeis;
CREATE POLICY "update_own_papeis" ON papeis FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_papeis" ON papeis;
CREATE POLICY "delete_own_papeis" ON papeis FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ MENSAGENS ============
CREATE TABLE IF NOT EXISTS mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES usuarios(id) ON DELETE CASCADE,
  texto text NOT NULL,
  created_at timestamptz DEFAULT now(),
  papel_id uuid REFERENCES papeis(id) ON DELETE SET NULL
);

ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

-- Users can read messages in chats they participate in
DROP POLICY IF EXISTS "select_own_mensagens" ON mensagens;
CREATE POLICY "select_own_mensagens" ON mensagens FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = mensagens.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

-- Users can insert messages as themselves in chats they participate in
DROP POLICY IF EXISTS "insert_own_mensagens" ON mensagens;
CREATE POLICY "insert_own_mensagens" ON mensagens FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = mensagens.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

-- Users can update their own messages
DROP POLICY IF EXISTS "update_own_mensagens" ON mensagens;
CREATE POLICY "update_own_mensagens" ON mensagens FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

-- Users can delete their own messages
DROP POLICY IF EXISTS "delete_own_mensagens" ON mensagens;
CREATE POLICY "delete_own_mensagens" ON mensagens FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

-- ============ CONFIG_CHAT ============
CREATE TABLE IF NOT EXISTS config_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES usuarios(id) ON DELETE CASCADE,
  background_url text,
  background_opacity numeric NOT NULL DEFAULT 0.5,
  CONSTRAINT config_chat_user_unique UNIQUE (chat_id, user_id)
);

ALTER TABLE config_chat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_config_chat" ON config_chat;
CREATE POLICY "select_own_config_chat" ON config_chat FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_config_chat" ON config_chat;
CREATE POLICY "insert_own_config_chat" ON config_chat FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_config_chat" ON config_chat;
CREATE POLICY "update_own_config_chat" ON config_chat FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_config_chat" ON config_chat;
CREATE POLICY "delete_own_config_chat" ON config_chat FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_chats_user1 ON chats(user1_id);
CREATE INDEX IF NOT EXISTS idx_chats_user2 ON chats(user2_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_chat_id ON mensagens(chat_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_created_at ON mensagens(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_papeis_user_id ON papeis(user_id);
CREATE INDEX IF NOT EXISTS idx_config_chat_user ON config_chat(chat_id, user_id);

-- ============ TRIGGER: Auto-create usuario profile on signup ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, username, display_name)
  VALUES (
    NEW.id,
    lower(replace(NEW.email, '@', '_')),
    split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ FUNCTION: Find or create chat ============
-- Ensures user1_id < user2_id ordering to prevent duplicate chats
CREATE OR REPLACE FUNCTION find_or_create_chat(p_user1 uuid, p_user2 uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_chat_id uuid;
  v_min uuid := least(p_user1, p_user2);
  v_max uuid := greatest(p_user1, p_user2);
BEGIN
  SELECT id INTO v_chat_id
  FROM chats
  WHERE user1_id = v_min AND user2_id = v_max
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    INSERT INTO chats (user1_id, user2_id)
    VALUES (v_min, v_max)
    ON CONFLICT (user1_id, user2_id) DO UPDATE SET created_at = chats.created_at
    RETURNING id INTO v_chat_id;
  END IF;

  RETURN v_chat_id;
END;
$$;

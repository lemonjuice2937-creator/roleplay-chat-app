-- Fix papeis RLS to allow reading papeis referenced in messages from chats user participates in
-- This allows the frontend to get papel data for messages in shared chats

-- Drop the restrictive policy
DROP POLICY IF EXISTS "select_own_papeis" ON papeis;

-- New policy: users can read papeis that they own OR that are referenced in messages from chats they participate in
CREATE POLICY "select_accessible_papeis" ON papeis FOR SELECT
  TO authenticated USING (
    -- User owns the papel
    auth.uid() = user_id
    OR
    -- Or papel is referenced in a mensagem from a chat the user participates in
    EXISTS (
      SELECT 1 FROM mensagens m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.papel_id = papeis.id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );
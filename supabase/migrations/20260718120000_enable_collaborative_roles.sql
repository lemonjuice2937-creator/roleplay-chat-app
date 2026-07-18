-- Enable collaborative roles: both users in a chat can view and edit each other's roles
-- Only the owner can delete.

-- 1. Replace SELECT policy: show roles from chat partners (not just message-referenced)
DROP POLICY IF EXISTS "select_accessible_papeis" ON papeis;

CREATE POLICY "select_accessible_papeis" ON papeis FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM chats c
      WHERE (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
      AND (c.user1_id = papeis.user_id OR c.user2_id = papeis.user_id)
    )
  );

-- 2. Replace UPDATE policy: allow chat partners to update each other's roles
DROP POLICY IF EXISTS "update_own_papeis" ON papeis;

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

-- 3. DELETE policy remains owner-only (no change needed)

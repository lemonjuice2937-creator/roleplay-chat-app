/*
# Fix security issues: bucket listing + SECURITY DEFINER function access

## Changes

### 1. Public bucket listing restriction
- The `imagens` bucket is public (needed for object URL access via getPublicUrl).
- The broad SELECT policy "Public read access for imagens" allowed listing ALL files
  in the bucket, exposing more data than intended.
- Fix: Replace the broad SELECT policy with one restricted to `authenticated` only.
  Public URL access still works because Supabase serves public bucket objects
  directly via their URL without going through RLS. The SELECT policy only governs
  the list/objects API endpoint, not direct URL access.

### 2. Revoke EXECUTE on SECURITY DEFINER functions
- `handle_new_user()` is a trigger function — it should only be called by the
  trigger on auth.users, never via REST RPC. Revoke EXECUTE from anon and authenticated.
- `find_or_create_chat()` is called by authenticated users via RPC. It needs
  SECURITY DEFINER to bypass RLS on the chats table during the upsert.
  Revoke EXECUTE from anon (should never be callable unauthenticated).
  Keep authenticated EXECUTE but add an ownership check inside the function body
  so callers can only create chats where they are a participant.

## Security impact
- anon can no longer list bucket contents or execute either function.
- authenticated can still upload/read images and call find_or_create_chat.
- handle_new_user is now only callable by the database trigger.
- find_or_create_chat validates that the caller is one of the two chat participants.
*/

-- ============ 1. Restrict bucket listing ============
-- Drop the broad public SELECT policy
DROP POLICY IF EXISTS "Public read access for imagens" ON storage.objects;

-- Replace with authenticated-only SELECT (listing). Direct URL access to public
-- bucket objects is unaffected — it doesn't go through RLS.
DROP POLICY IF EXISTS "Authenticated read access for imagens" ON storage.objects;
CREATE POLICY "Authenticated read access for imagens" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'imagens');

-- ============ 2. Revoke EXECUTE on trigger function ============
-- handle_new_user should only run via the auth.users trigger, never via RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- ============ 3. Lock down find_or_create_chat ============
-- Revoke from anon (unauthenticated users should never create chats)
REVOKE EXECUTE ON FUNCTION public.find_or_create_chat(uuid, uuid) FROM anon;

-- Recreate with internal ownership check (SECURITY DEFINER bypasses RLS,
-- so we must validate the caller is a participant ourselves)
CREATE OR REPLACE FUNCTION find_or_create_chat(p_user1 uuid, p_user2 uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_chat_id uuid;
  v_min uuid := least(p_user1, p_user2);
  v_max uuid := greatest(p_user1, p_user2);
  v_caller uuid := auth.uid();
BEGIN
  -- Ensure the authenticated caller is one of the two participants
  IF v_caller IS NULL OR (v_caller <> p_user1 AND v_caller <> p_user2) THEN
    RAISE EXCEPTION 'Not authorized: caller must be a chat participant';
  END IF;

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

-- Keep EXECUTE on find_or_create_chat for authenticated only (already granted by default
-- to authenticated, but be explicit after recreating)
GRANT EXECUTE ON FUNCTION public.find_or_create_chat(uuid, uuid) TO authenticated;

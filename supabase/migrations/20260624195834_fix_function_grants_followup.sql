/*
# Fix function execute grants (follow-up)

The previous REVOKE didn't take effect because default PUBLIC grants on functions
persist even after REVOKE from specific roles. Must REVOKE FROM PUBLIC explicitly,
then GRANT only to the roles that need it.

- handle_new_user: trigger-only function. Revoke from PUBLIC, anon, authenticated.
- find_or_create_chat: Revoke from PUBLIC and anon. Grant to authenticated only.
*/

-- Revoke all public/default access on both functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE ALL ON FUNCTION public.find_or_create_chat(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_or_create_chat(uuid, uuid) FROM anon;

-- Grant execute on find_or_create_chat to authenticated only
GRANT EXECUTE ON FUNCTION public.find_or_create_chat(uuid, uuid) TO authenticated;

-- Função para marcar mensagens não lidas como lidas quando o usuário abre o chat
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_chat_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.mensagens
  SET read_at = now()
  WHERE chat_id = p_chat_id
    AND sender_id != p_user_id
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para contar mensagens não lidas de um chat
CREATE OR REPLACE FUNCTION public.get_unread_count(p_chat_id uuid, p_user_id uuid)
RETURNS integer AS $$
  SELECT count(*)::integer
  FROM public.mensagens
  WHERE chat_id = p_chat_id
    AND sender_id != p_user_id
    AND read_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Permissões
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_count(uuid, uuid) TO authenticated;

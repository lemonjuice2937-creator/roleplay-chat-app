import { supabase } from '../lib/supabase';

export interface SkillItem {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  role_id: string | null;
  created_at?: string;
}

export async function saveSkillRecord(
  userId: string,
  nome: string,
  descricao?: string,
  roleId?: string
): Promise<SkillItem> {
  const { data, error } = await supabase
    .from('skills')
    .insert({
      user_id: userId,
      nome,
      descricao: descricao ?? null,
      role_id: roleId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchSkills(roleId?: string): Promise<SkillItem[]> {
  let query = supabase
    .from('skills')
    .select('*');

  if (roleId) {
    query = query.eq('role_id', roleId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteSkill(id: string): Promise<void> {
  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

import { supabase } from '../lib/supabase';

export interface VestuarioItem {
  id: string;
  user_id: string;
  imagem_url: string;
  nome: string | null;
  descricao: string | null;
  role_id: string | null;
  created_at?: string;
}

export async function uploadClothingFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `clothes/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('vestuario')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('vestuario').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function saveClothingRecord(
  userId: string,
  imageUrl: string,
  nome?: string,
  descricao?: string,
  roleId?: string
): Promise<VestuarioItem> {
  const { data, error } = await supabase
    .from('vestuario')
    .insert({
      user_id: userId,
      imagem_url: imageUrl,
      nome: nome ?? null,
      descricao: descricao ?? null,
      role_id: roleId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchClothing(roleId?: string): Promise<VestuarioItem[]> {
  let query = supabase
    .from('vestuario')
    .select('*');

  if (roleId) {
    query = query.eq('role_id', roleId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteClothing(id: string, filePath: string): Promise<void> {
  const [dbResult, storageResult] = await Promise.all([
    supabase.from('vestuario').delete().eq('id', id),
    supabase.storage.from('vestuario').remove([filePath]),
  ]);

  if (dbResult.error) throw dbResult.error;
  if (storageResult.error) throw storageResult.error;
}

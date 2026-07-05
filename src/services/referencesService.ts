import { supabase } from '../lib/supabase';

export async function uploadReferenceFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `refs/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('referencias')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('referencias').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function saveReferenceRecord(
  userId: string,
  imageUrl: string,
  nome?: string,
  descricao?: string,
  roleId?: string
): Promise<any> {
  const { data, error } = await supabase
    .from('referencias')
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

export async function fetchReferences(roleId?: string): Promise<any[]> {
  let query = supabase
    .from('referencias')
    .select('*');

  if (roleId) {
    query = query.eq('role_id', roleId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteReference(id: string, filePath: string): Promise<void> {
  const [dbResult, storageResult] = await Promise.all([
    supabase.from('referencias').delete().eq('id', id),
    supabase.storage.from('referencias').remove([filePath]),
  ]);

  if (dbResult.error) throw dbResult.error;
  if (storageResult.error) throw storageResult.error;
}

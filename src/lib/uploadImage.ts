import { supabase } from './supabase';

export async function uploadImage(
  file: File,
  folder: string,
  userId: string,
): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${folder}/${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('imagens')
    .upload(path, file, { cacheControl: '3600', upsert: true });

  if (error) return null;

  const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(path);
  return publicUrl;
}

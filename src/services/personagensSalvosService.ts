import { supabase } from '../lib/supabase';
import type { PersonagemSalvo } from '../types/database';

async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function base64ToFile(base64: string, filename: string): Promise<File> {
  const res = await fetch(base64);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

export async function salvarPersonagem(
  userId: string,
  papel: { nome: string; avatar_url: string | null; cor_balao: string; cor_fonte: string; descricao?: string },
  referencias: { imagem_url: string; nome?: string; descricao?: string }[],
  vestuario: { imagem_url: string; nome?: string; descricao?: string }[],
  skills: { nome: string; descricao?: string }[]
): Promise<PersonagemSalvo> {
  const avatar_base64 = papel.avatar_url ? await urlToBase64(papel.avatar_url) : undefined;

  const ref_images_base64: string[] = [];
  for (const ref of referencias) {
    try {
      ref_images_base64.push(await urlToBase64(ref.imagem_url));
    } catch {
      ref_images_base64.push('');
    }
  }

  const vest_images_base64: string[] = [];
  for (const vest of vestuario) {
    try {
      vest_images_base64.push(await urlToBase64(vest.imagem_url));
    } catch {
      vest_images_base64.push('');
    }
  }

  const dados = {
    papel,
    referencias,
    vestuario,
    skills,
    avatar_base64,
    ref_images_base64,
    vest_images_base64,
  };

  // Upsert: check if a backup already exists for this user + papel name
  const { data: existing } = await supabase
    .from('personagens_salvos')
    .select('id')
    .eq('user_id', userId)
    .eq('nome', papel.nome)
    .maybeSingle();

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from('personagens_salvos')
      .update({ dados, nome: papel.nome })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('personagens_salvos')
      .insert({ user_id: userId, nome: papel.nome, dados })
      .select()
      .single();
    if (error) throw error;
    result = data;
  }

  return result as PersonagemSalvo;
}

export async function autoBackupPapel(papelId: string, userId: string): Promise<void> {
  try {
    // Fetch the papel
    const { data: papel } = await supabase
      .from('papeis')
      .select('nome, avatar_url, cor_balao, cor_fonte, descricao')
      .eq('id', papelId)
      .single();
    if (!papel) return;

    // Fetch references
    const { data: refs } = await supabase
      .from('referencias')
      .select('imagem_url, nome, descricao')
      .eq('role_id', papelId)
      .eq('user_id', userId);

    // Fetch clothing
    const { data: vests } = await supabase
      .from('vestuario')
      .select('imagem_url, nome, descricao')
      .eq('role_id', papelId)
      .eq('user_id', userId);

    // Fetch skills
    const { data: sks } = await supabase
      .from('skills')
      .select('nome, descricao')
      .eq('role_id', papelId)
      .eq('user_id', userId);

    await salvarPersonagem(
      userId,
      papel,
      refs ?? [],
      vests ?? [],
      sks ?? []
    );
  } catch (err) {
    console.error('Auto-backup failed:', err);
  }
}

export async function listarPersonagens(userId: string): Promise<PersonagemSalvo[]> {
  const { data, error } = await supabase
    .from('personagens_salvos')
    .select('*')
    .eq('user_id', userId)
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PersonagemSalvo[];
}

export async function deletarPersonagem(id: string): Promise<void> {
  const { error } = await supabase
    .from('personagens_salvos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function importarPersonagem(
  personagem: PersonagemSalvo,
  novoUserId: string
): Promise<void> {
  const { papel, referencias, vestuario, skills, avatar_base64, ref_images_base64, vest_images_base64 } = personagem.dados;

  let avatarUrl = papel.avatar_url;
  if (avatar_base64) {
    const ext = avatar_base64.split(';')[0].split('/')[1] || 'jpg';
    const file = await base64ToFile(avatar_base64, `avatar.${ext}`);
    const filePath = `papeis/${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('imagens')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage.from('imagens').getPublicUrl(filePath);
    avatarUrl = urlData.publicUrl;
  }

  const { data: newPapel, error: papelErr } = await supabase
    .from('papeis')
    .insert({
      user_id: novoUserId,
      nome: papel.nome,
      avatar_url: avatarUrl,
      cor_balao: papel.cor_balao,
      cor_fonte: papel.cor_fonte,
      descricao: papel.descricao ?? null,
      equipado: false,
    })
    .select()
    .single();

  if (papelErr) throw papelErr;
  const newRoleId = newPapel.id;

  for (let i = 0; i < referencias.length; i++) {
    const ref = referencias[i];
    let imageUrl = ref.imagem_url;
    const base64 = ref_images_base64?.[i];
    if (base64) {
      try {
        const ext = base64.split(';')[0].split('/')[1] || 'jpg';
        const file = await base64ToFile(base64, `ref_${i}.${ext}`);
        const filePath = `refs/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('referencias')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('referencias').getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      } catch {
        // keep original URL
      }
    }
    await supabase.from('referencias').insert({
      user_id: novoUserId,
      imagem_url: imageUrl,
      nome: ref.nome ?? null,
      descricao: ref.descricao ?? null,
      role_id: newRoleId,
    });
  }

  for (let i = 0; i < vestuario.length; i++) {
    const vest = vestuario[i];
    let imageUrl = vest.imagem_url;
    const base64 = vest_images_base64?.[i];
    if (base64) {
      try {
        const ext = base64.split(';')[0].split('/')[1] || 'jpg';
        const file = await base64ToFile(base64, `vest_${i}.${ext}`);
        const filePath = `clothes/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('vestuario')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('vestuario').getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      } catch {
        // keep original URL
      }
    }
    await supabase.from('vestuario').insert({
      user_id: novoUserId,
      imagem_url: imageUrl,
      nome: vest.nome ?? null,
      descricao: vest.descricao ?? null,
      role_id: newRoleId,
    });
  }

  for (const skill of skills) {
    await supabase.from('skills').insert({
      user_id: novoUserId,
      nome: skill.nome,
      descricao: skill.descricao ?? null,
      role_id: newRoleId,
    });
  }
}

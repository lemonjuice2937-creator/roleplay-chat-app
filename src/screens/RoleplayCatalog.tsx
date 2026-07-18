import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Papel } from '../types/database';
import { X, Loader2, Upload } from 'lucide-react';
import ImageCropperModal from '../components/ImageCropperModal';

interface Props {
  papeis: Papel[];
  onClose: () => void;
  onRefresh?: () => void;
}

export default function RoleplayCatalog({ papeis, onClose, onRefresh }: Props) {
  const { profile } = useAuth();
  const [nome, setNome] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [criando, setCriando] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File | Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.7);
        };
      };
    });
  };

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  }

  async function uploadCroppedImage(croppedBlob: Blob) {
    if (!profile) return;
    setUploading(true);
    try {
      const optimizedBlob = await compressImage(croppedBlob);
      const path = `papeis/${profile.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('imagens')
        .upload(path, optimizedBlob, { cacheControl: '3600', upsert: true });

      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(path);
        setAvatarUrl(publicUrl);
      } else {
        alert(`Erro de Upload: ${upErr.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      setCropModalOpen(false);
      setImageToCrop(null);
    }
  }

  async function handleCriarPapel() {
    if (!profile || !nome) return;
    setCriando(true);
    try {
      const { error } = await supabase
        .from('papeis')
        .insert([{
          user_id: profile.id,
          nome: nome,
          avatar_url: avatarUrl,
        }]);

      if (error) throw error;

      onRefresh?.();
      onClose();
    } catch (err: any) {
      alert(`Erro ao salvar papel: ${err.message}`);
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-navy-900 border border-white/10 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition">
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Criar Personagem</h2>

        <div className="space-y-4">
          {/* Avatar Area */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-full bg-navy-600 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden active:scale-95 transition relative"
            >
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-purple-500" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Upload size={24} className="text-white/40" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <p className="text-white/40 text-xs">Foto do personagem</p>
          </div>

          {/* Name Field */}
          <div>
            <label className="text-white/50 text-sm mb-1.5 block">Nome do personagem</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition"
              placeholder="Ex: Salvatore"
            />
          </div>

          {/* Message Box Preview */}
          <div>
            <label className="text-white/50 text-sm mb-2 block">Prévia da mensagem</label>
            <div className="bg-purple-600/20 rounded-2xl p-4 border border-purple-500/30 transition-all duration-200">
              <p className="text-sm font-semibold mb-1 text-purple-400">{nome || 'Nome do Personagem'}</p>
              <p className="text-sm text-white/80 leading-relaxed">Sua mensagem de interpretação vai aparecer com esse visual aqui dentro do chat.</p>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleCriarPapel}
            disabled={!nome || uploading || criando}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-2xl shadow-lg transition duration-200 flex items-center justify-center gap-2"
          >
            {(uploading || criando) && <Loader2 size={20} className="animate-spin" />}
            Criar papel
          </button>
        </div>
      </div>

      {cropModalOpen && imageToCrop && (
        <ImageCropperModal
          image={imageToCrop}
          onCropComplete={(blob) => { if (blob) uploadCroppedImage(blob); }}
          onClose={() => { setCropModalOpen(false); setImageToCrop(null); }}
        />
      )}
    </div>
  );
}

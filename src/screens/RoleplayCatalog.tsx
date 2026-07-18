import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Papel } from '../types/database';
import { X, Loader2, Upload, User, ChevronDown, ChevronUp } from 'lucide-react';
import ImageCropperModal from '../components/ImageCropperModal';
import { hexToHsv, getColorName, isValidHex, GradientColorPicker } from '../components/ColorPicker';
import { autoBackupPapel } from '../services/personagensSalvosService';

interface Props {
  papeis: Papel[];
  onClose: () => void;
  onRefresh?: () => void;
}

export default function RoleplayCatalog({ papeis, onClose, onRefresh }: Props) {
  const { profile } = useAuth();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [corBalao, setCorBalao] = useState('#8A2BE2');
  const [corFonte, setCorFonte] = useState('#FFFFFF');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [criando, setCriando] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showBalaoPicker, setShowBalaoPicker] = useState(false);
  const [showFontePicker, setShowFontePicker] = useState(false);
  const [balaoHue, setBalaoHue] = useState(() => hexToHsv('#8A2BE2').h);
  const [fonteHue, setFonteHue] = useState(() => hexToHsv('#FFFFFF').h);

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
    e.target.value = '';
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
    if (!profile || !nome.trim()) return;
    setCriando(true);
    try {
      const { data: newPapel, error } = await supabase
        .from('papeis')
        .insert([{
          user_id: profile.id,
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          avatar_url: avatarUrl,
          cor_balao: corBalao,
          cor_fonte: corFonte,
          equipado: false,
        }])
        .select()
        .single();

      if (error) throw error;

      // Auto-backup (fire-and-forget)
      if (newPapel) {
        autoBackupPapel(newPapel.id, profile.id);
      }

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
      <div className="bg-navy-900 border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-xl font-bold text-white">Criar Personagem</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-navy-800 flex items-center justify-center active:scale-90 transition">
            <X size={18} className="text-white/60" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-full bg-navy-800 border-2 border-dashed border-purple-500/30 flex items-center justify-center overflow-hidden active:scale-95 transition relative group"
            >
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-purple-500" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-white/30 group-hover:text-white/50 transition" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <p className="text-white/40 text-xs">Foto do personagem</p>
          </div>

          {/* Name */}
          <div>
            <label className="text-white/50 text-sm mb-1.5 block">Nome do personagem</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={20}
              className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition"
              placeholder="Ex: Salvatore"
            />
            <span className="text-[10px] text-white/30 text-right block mt-1">{nome.length}/20</span>
          </div>

          {/* Description */}
          <div>
            <label className="text-white/50 text-sm mb-1.5 block">Descrição (opcional)</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={250}
              className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:border-purple-500 transition"
              placeholder="Quem é esse personagem?"
              rows={3}
            />
            <span className="text-[10px] text-white/30 text-right block mt-1">{descricao.length}/250</span>
          </div>

          {/* Bubble Color */}
          <div>
            <button
              type="button"
              onClick={() => setShowBalaoPicker(!showBalaoPicker)}
              className="w-full flex justify-between items-center bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-white hover:border-white/20 transition"
            >
              <span className="text-sm font-medium">Cor do balão</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 font-mono">{corBalao.toUpperCase()}</span>
                <div className="w-6 h-6 rounded-md border border-white/20 shadow-inner" style={{ backgroundColor: corBalao }} />
                {showBalaoPicker ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
              </div>
            </button>
            {showBalaoPicker && (
              <div className="mt-2 p-3 bg-navy-950/50 border border-white/5 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md border border-white/20 shadow-inner shrink-0" style={{ backgroundColor: corBalao }} />
                  <span className="text-xs text-white/50">{getColorName(corBalao)}</span>
                </div>
                <GradientColorPicker
                  color={corBalao}
                  onChange={setCorBalao}
                  hue={balaoHue}
                  onHueChange={setBalaoHue}
                />
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Hex</label>
                  <input
                    type="text"
                    value={corBalao}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isValidHex(val)) {
                        setCorBalao(val.toUpperCase());
                        setBalaoHue(hexToHsv(val).h);
                      }
                      else if (val === '' || val === '#') setCorBalao(val);
                    }}
                    maxLength={7}
                    className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                    placeholder="#FF0000"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Font Color */}
          <div>
            <button
              type="button"
              onClick={() => setShowFontePicker(!showFontePicker)}
              className="w-full flex justify-between items-center bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-white hover:border-white/20 transition"
            >
              <span className="text-sm font-medium">Cor do texto</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 font-mono">{corFonte.toUpperCase()}</span>
                <div className="w-6 h-6 rounded-md border border-white/20 shadow-inner" style={{ backgroundColor: corFonte }} />
                {showFontePicker ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
              </div>
            </button>
            {showFontePicker && (
              <div className="mt-2 p-3 bg-navy-950/50 border border-white/5 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md border border-white/20 shadow-inner shrink-0" style={{ backgroundColor: corFonte }} />
                  <span className="text-xs text-white/50">{getColorName(corFonte)}</span>
                </div>
                <GradientColorPicker
                  color={corFonte}
                  onChange={setCorFonte}
                  hue={fonteHue}
                  onHueChange={setFonteHue}
                />
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Hex</label>
                  <input
                    type="text"
                    value={corFonte}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isValidHex(val)) {
                        setCorFonte(val.toUpperCase());
                        setFonteHue(hexToHsv(val).h);
                      }
                      else if (val === '' || val === '#') setCorFonte(val);
                    }}
                    maxLength={7}
                    className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Message Preview */}
          <div>
            <label className="text-white/50 text-sm mb-2 block">Prévia da mensagem</label>
            <div className="rounded-2xl p-4 transition-all duration-200" style={{ backgroundColor: corBalao }}>
              <p className="text-sm font-semibold mb-1" style={{ color: corFonte }}>{nome || 'Nome do Personagem'}</p>
              <p className="text-sm leading-relaxed" style={{ color: corFonte }}>Sua mensagem de interpretação vai aparecer com esse visual aqui dentro do chat.</p>
            </div>
          </div>

          {/* Create Button */}
          <button
            type="button"
            onClick={handleCriarPapel}
            disabled={!nome.trim() || uploading || criando}
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

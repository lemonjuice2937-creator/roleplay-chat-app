import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { validateImageFile } from '../lib/sanitize';
import { uploadImage } from '../lib/uploadImage';
import type { ConfigChat } from '../types/database';
import { Upload, Check } from 'lucide-react';
import ModalSheet from '../components/ModalSheet';
import LoadingSpinner from '../components/LoadingSpinner';

interface Props {
  chatId: string;
  config: ConfigChat | null;
  onClose: () => void;
  onConfigUpdated: (config: ConfigChat) => void;
}

export default function BackgroundSettings({ chatId, config, onClose, onConfigUpdated }: Props) {
  const { profile } = useAuth();
  const [bgUrl, setBgUrl] = useState<string | null>(config?.background_url ?? null);
  const [opacity, setOpacity] = useState<number>(config?.background_opacity ?? 0.5);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    setUploading(true);
    setError(null);

    const publicUrl = await uploadImage(file, `backgrounds/${profile.id}`, chatId);
    if (publicUrl) {
      setBgUrl(publicUrl);
    } else {
      console.error('Background upload failed');
      setError('Erro ao enviar imagem');
    }

    setUploading(false);
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError(null);

    const payload = {
      chat_id: chatId,
      user_id: profile.id,
      background_url: bgUrl,
      background_opacity: opacity,
    };

    const { data, error: saveError } = await supabase
      .from('config_chat')
      .upsert(payload, { onConflict: 'chat_id,user_id' })
      .select('*')
      .single();

    if (saveError) {
      console.error('Failed to save background config:', saveError.message);
      setError('Erro ao salvar configuração');
    } else if (data) {
      onConfigUpdated(data as ConfigChat);
      onClose();
    }
    setSaving(false);
  }

  async function handleRemove() {
    setBgUrl(null);
  }

  return (
    <ModalSheet
      title="Personalizar Fundo"
      onClose={onClose}
      footer={
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-pill w-full bg-neon text-white flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {saving ? <LoadingSpinner size={18} className="text-white" /> : <Check size={18} />}
          Salvar
        </button>
      }
    >
      <div className="space-y-5">
        {/* Preview */}
        <div className="relative w-full h-40 rounded-3xl overflow-hidden bg-navy-900">
          {bgUrl ? (
            <>
              <img src={bgUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-navy-800" style={{ opacity }} />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/30 text-sm">Sem fundo personalizado</p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        {/* Upload */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-pill w-full bg-navy-600 text-white flex items-center justify-center gap-2"
          >
            {uploading ? <LoadingSpinner size={18} className="text-white" /> : <Upload size={18} />}
            {bgUrl ? 'Trocar imagem' : 'Enviar imagem'}
          </button>
          {bgUrl && (
            <button
              onClick={handleRemove}
              className="btn-pill w-full bg-transparent text-red-400 mt-2 text-sm"
            >
              Remover fundo
            </button>
          )}
        </div>

        {/* Opacity slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/50 text-sm">Opacidade da camada escura</label>
            <span className="text-neon font-medium text-sm">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-navy-900 accent-neon"
          />
          <p className="text-white/30 text-xs mt-2">
            Maior opacidade = fundo mais escuro = mensagens mais legíveis
          </p>
        </div>
      </div>
    </ModalSheet>
  );
}

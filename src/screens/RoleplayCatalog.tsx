import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { validateImageFile, sanitizeHexColor } from '../lib/sanitize';
import type { Papel } from '../types/database';
import { X, Plus, Check, Loader2, Upload, Trash2 } from 'lucide-react';

interface Props {
  papeis: Papel[];
  onClose: () => void;
  onPapeisChanged: () => void;
}

export default function RoleplayCatalog({ papeis, onClose, onPapeisChanged }: Props) {
  const { profile } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPapel, setSelectedPapel] = useState<Papel | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [nome, setNome] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [corBalao, setCorBalao] = useState('#8A2BE2');
  const [corFonte, setCorFonte] = useState('#FFFFFF');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const corBalaoRef = useRef<HTMLInputElement>(null);
  const corFonteRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `papeis/${profile.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('imagens')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(path);
        setAvatarUrl(publicUrl);
      } else {
        alert(`Aviso de Upload: ${upErr.message} (Verifique se o bucket 'imagens' existe no Supabase)`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    if (!nome.trim() || !profile) return;
    setLoading(true);

    try {
      // DESATIVA OUTROS PAPÉIS PRIMEIRO
      const { error: deactivateError } = await supabase
        .from('papeis')
        .update({ equipado: false })
        .eq('user_id', profile.id);

      if (deactivateError) {
        alert('Erro ao desativar papéis anteriores: ' + deactivateError.message);
        return;
      }

      // INSERE O NOVO
      const { error } = await supabase.from('papeis').insert({
        user_id: profile.id,
        nome: nome.trim(),
        avatar_url: avatarUrl,
        cor_balao: sanitizeHexColor(corBalao, '#8A2BE2'),
        cor_fonte: sanitizeHexColor(corFonte, '#FFFFFF'),
        equipado: true,
      });

      if (!error) {

        setNome('');
        setAvatarUrl(null);
        setCorBalao('#8A2BE2');
        setCorFonte('#FFFFFF');
        setShowCreate(false);
        onPapeisChanged();
      } else {
        alert(`Erro ao criar no banco de dados: ${error.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleEquipar(papel: Papel) {
    if (!profile) return;
    const newEquipado = !papel.equipado;

    try {
      // SE VAI EQUIPAR, DESATIVA OS OUTROS PRIMEIRO PARA NÃO TER DUPLICADOS
      if (newEquipado) {
        const { error: deactivateError } = await supabase
          .from('papeis')
          .update({ equipado: false })
          .eq('user_id', profile.id);

        if (deactivateError) {
          alert('Erro ao desativar papéis: ' + deactivateError.message);
          return;
        }
      }

      const { error } = await supabase
        .from('papeis')
        .update({ equipado: newEquipado })
        .eq('id', papel.id);

      if (!error) {
        onPapeisChanged();
        setSelectedPapel(null);
      } else {
        alert(`Erro ao equipar: ${error.message}`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function deletePapel(papel: Papel) {
    const { error } = await supabase.from('papeis').delete().eq('id', papel.id);
    if (error) {
      console.error('Failed to delete papel:', error.message);
      alert('Erro ao deletar papel: ' + error.message);
      return;
    }
    onPapeisChanged();
    setSelectedPapel(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-navy-700 rounded-t-[2rem] sm:rounded-[2rem] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold">Catálogo de Papéis</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-navy-600 flex items-center justify-center active:scale-90 transition">
            <X size={18} className="text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {papeis.length === 0 && !showCreate ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <button
                onClick={() => setShowCreate(true)}
                className="w-16 h-16 rounded-3xl bg-neon flex items-center justify-center mb-4 active:scale-90 transition shadow-lg shadow-neon/30"
              >
                <Plus size={28} className="text-white" />
              </button>
              <p className="text-white/40">Nenhum papel criado</p>
              <p className="text-white/20 text-sm mt-1">Toque para criar seu primeiro personagem</p>
            </div>
          ) : showCreate ? (
            /* Create form */
            <div className="space-y-4">
              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-navy-600 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden active:scale-95 transition"
                >
                  {uploading ? (
                    <Loader2 size={24} className="animate-spin text-neon" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={24} className="text-white/40" />
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                <p className="text-white/40 text-xs">Foto do personagem</p>
              </div>

              {/* Name */}
              <div>
                <label className="text-white/50 text-sm mb-1.5 block">Nome do personagem</label>
                <input
                  type="text"
                  placeholder="Ex: Salvatore"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="input-pill w-full"
                />
              </div>

              {/* Cor do balão */}
              <div>
                <label className="text-white/50 text-sm mb-2 block">Cor do balão</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => corBalaoRef.current?.click()}
                    className="w-12 h-12 rounded-full transition active:scale-90 ring-2 ring-white/30 hover:ring-white/50"
                    style={{ backgroundColor: corBalao }}
                  />
                  <input
                    ref={corBalaoRef}
                    type="color"
                    value={corBalao}
                    onChange={(e) => setCorBalao(e.target.value)}
                    className="absolute opacity-0 pointer-events-none"
                  />
                  <span className="text-white/40 text-sm font-mono">{corBalao}</span>
                </div>
              </div>

              {/* Cor da fonte */}
              <div>
                <label className="text-white/50 text-sm mb-2 block">Cor do texto</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => corFonteRef.current?.click()}
                    className="w-12 h-12 rounded-full transition active:scale-90 ring-2 ring-white/30 hover:ring-white/50"
                    style={{ backgroundColor: corFonte }}
                  />
                  <input
                    ref={corFonteRef}
                    type="color"
                    value={corFonte}
                    onChange={(e) => setCorFonte(e.target.value)}
                    className="absolute opacity-0 pointer-events-none"
                  />
                  <span className="text-white/40 text-sm font-mono">{corFonte}</span>
                </div>
              </div>

              {/* Preview */}
              <div
                className="rounded-3xl px-4 py-3"
                style={{ backgroundColor: corBalao, color: corFonte }}
              >
                <p className="text-sm" style={{ fontFamily: 'inherit' }}>Prévia da mensagem</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setShowCreate(false); setNome(''); setAvatarUrl(null); }}
                  className="btn-pill flex-1 bg-navy-600 text-white/70"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!nome.trim() || loading}
                  className="btn-pill flex-1 bg-neon text-white flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Criar
                </button>
              </div>
            </div>
          ) : (
            /* Papel grid */
            <div className="grid grid-cols-3 gap-3">
              {/* Create button */}
              <button
                onClick={() => setShowCreate(true)}
                className="aspect-square rounded-3xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-1 active:scale-95 transition"
              >
                <Plus size={24} className="text-neon" />
                <span className="text-xs text-white/40">Novo</span>
              </button>

              {papeis.map((papel) => (
                <button
                  key={papel.id}
                  onClick={() => setSelectedPapel(papel)}
                  className={`aspect-square rounded-3xl flex flex-col items-center justify-center gap-1.5 transition active:scale-95 ${
                    papel.equipado ? 'opacity-100' : 'opacity-50'
                  }`}
                  style={{ backgroundColor: papel.cor_balao + '20' }}
                >
                  {papel.avatar_url ? (
                    <img src={papel.avatar_url} alt={papel.nome} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ backgroundColor: papel.cor_balao, color: papel.cor_fonte }}
                    >
                      {papel.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-white/70 truncate max-w-full px-1">{papel.nome}</span>
                  {papel.equipado && <Check size={14} className="text-neon" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create button (when not in create mode and has papeis) */}
        {papeis.length > 0 && !showCreate && (
          <div className="p-4">
            <button
              onClick={() => setShowCreate(true)}
              className="btn-pill w-full bg-neon text-white flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Criar Novo Papel
            </button>
          </div>
        )}
      </div>

      {/* Papel detail overlay */}
      {selectedPapel && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
          onClick={() => setSelectedPapel(null)}
        >
          <div
            className="bg-navy-700 rounded-[2rem] p-6 w-full max-w-xs text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedPapel.avatar_url ? (
              <img src={selectedPapel.avatar_url} alt={selectedPapel.nome} className="w-24 h-24 rounded-full object-cover mx-auto mb-3 border-4" style={{ borderColor: selectedPapel.cor_balao }} />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3 border-4"
                style={{ backgroundColor: selectedPapel.cor_balao, color: selectedPapel.cor_fonte, borderColor: selectedPapel.cor_balao }}
              >
                {selectedPapel.nome.charAt(0).toUpperCase()}
              </div>
            )}
            <h3 className="text-xl font-bold mb-1">{selectedPapel.nome}</h3>
            <div className="inline-block rounded-full px-3 py-1 text-xs mb-5" style={{ backgroundColor: selectedPapel.cor_balao, color: selectedPapel.cor_fonte }}>
              {selectedPapel.equipado ? 'Equipado' : 'Deixado'}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => toggleEquipar(selectedPapel)}
                className={`btn-pill flex-1 ${selectedPapel.equipado ? 'bg-navy-600 text-white/70' : 'bg-neon text-white'}`}
              >
                {selectedPapel.equipado ? 'Deixar' : 'Equipar'}
              </button>
              <button
                onClick={() => deletePapel(selectedPapel)}
                className="btn-pill bg-red-500/20 text-red-400 px-4"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import type { PersonagemSalvo } from '../types/database';
import { ArrowLeft, Loader2, Check, Download, Trash2 } from 'lucide-react';
import { listarPersonagens, importarPersonagem, deletarPersonagem } from '../services/personagensSalvosService';
import ConfirmModal from './ConfirmModal';

interface BastidoresViewProps {
  onBack: () => void;
  onImported?: () => void;
}

export default function BastidoresView({ onBack, onImported }: BastidoresViewProps) {
  const { profile } = useAuth();
  const [personagens, setPersonagens] = useState<PersonagemSalvo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PersonagemSalvo | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await listarPersonagens(profile.id);
      setPersonagens(data);
    } catch (err) {
      console.error('Erro ao carregar bastidores:', err);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImport() {
    if (!profile || selected.size === 0) return;
    setImporting(true);
    try {
      const toImport = personagens.filter(p => selected.has(p.id));
      for (const p of toImport) {
        await importarPersonagem(p, profile.id);
      }
      setSelected(new Set());
      onImported?.();
      onBack();
    } catch (err) {
      console.error('Erro ao importar:', err);
      alert('Erro ao importar personagens. Tente novamente.');
    }
    setImporting(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deletarPersonagem(deleteTarget.id);
      setPersonagens(prev => prev.filter(p => p.id !== deleteTarget.id));
      setSelected(prev => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
    setDeleteTarget(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-navy-700 shrink-0">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition"
        >
          <ArrowLeft size={20} className="text-white/70" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white">Bastidores</h1>
          <p className="text-xs text-white/40">Personagens salvos no seu perfil</p>
        </div>
        {selected.size > 0 && (
          <span className="text-xs text-purple-400 font-medium">{selected.size} selecionado{selected.size > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-purple-400" />
          </div>
        ) : personagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3 px-6">
            <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center border-2 border-dashed border-white/15">
              <Download size={24} className="text-white/25" />
            </div>
            <p className="text-white/40 text-sm">Nenhum personagem salvo</p>
            <p className="text-white/25 text-xs">Salve personagens do catálogo para preservá-los aqui</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {personagens.map(p => {
              const isSelected = selected.has(p.id);
              const papel = p.dados?.papel;
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                    isSelected
                      ? 'bg-purple-500/20 border border-purple-500/40'
                      : 'bg-navy-800 border border-white/5 hover:bg-navy-750'
                  }`}
                >
                  {/* Avatar */}
                  {papel?.avatar_url ? (
                    <img
                      src={papel.avatar_url}
                      alt={papel.nome}
                      className="w-12 h-12 rounded-full object-cover shrink-0 border-2"
                      style={{ borderColor: papel?.cor_balao || '#8A2BE2' }}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 border-2"
                      style={{
                        backgroundColor: papel?.cor_balao || '#8A2BE2',
                        borderColor: papel?.cor_balao || '#8A2BE2',
                        color: papel?.cor_fonte || '#FFFFFF',
                      }}
                    >
                      {papel?.nome?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{papel?.nome || p.nome}</p>
                    <p className="text-xs text-white/30">
                      {p.dados?.skills?.length || 0} skills · {p.dados?.referencias?.length || 0} refs · {p.dados?.vestuario?.length || 0} vestuário
                    </p>
                  </div>

                  {/* Selection indicator / Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                      className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center active:scale-90 transition border border-white/10"
                      title="Excluir do bastidor"
                    >
                      <Trash2 size={14} className="text-red-400/70" />
                    </button>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 ${
                        isSelected
                          ? 'bg-purple-500 text-white'
                          : 'bg-navy-700 border border-white/20'
                      }`}
                    >
                      {isSelected && <Check size={14} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {selected.size > 0 && (
        <div className="px-4 py-3 bg-navy-700 border-t border-white/5 shrink-0">
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full h-12 rounded-3xl bg-neon text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
          >
            {importing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            {importing ? 'Importando...' : `Importar ${selected.size} personagem${selected.size > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmModal
          message={`Excluir "${deleteTarget.dados?.papel?.nome || deleteTarget.nome}" dos bastidores? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

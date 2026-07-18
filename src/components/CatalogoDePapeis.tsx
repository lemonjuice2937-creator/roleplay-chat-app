import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Papel } from '../types/database';
import { Plus, ChevronDown, Minus, Settings, Sparkles, Loader2 } from 'lucide-react';
import RoleplayCatalog from '../screens/RoleplayCatalog';
import RoleProfileModal from './RoleProfileModal';

interface CatalogoDePapeisProps {
  partnerId?: string;
  chatId?: string;
  onPapeisChanged?: () => void;
  onClose: () => void;
}

export default function CatalogoDePapeis({
  partnerId,
  chatId,
  onPapeisChanged,
  onClose,
}: CatalogoDePapeisProps) {
  const { profile } = useAuth();
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [partnerPapeis, setPartnerPapeis] = useState<Papel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingRole, setEditingRole] = useState<Papel | null>(null);

  const loadPapeis = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('papeis')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPapeis(data as Papel[]);
    }

    if (partnerId) {
      const { data: partnerData } = await supabase
        .from('papeis')
        .select('*')
        .eq('user_id', partnerId)
        .order('created_at', { ascending: false });

      if (partnerData) {
        setPartnerPapeis(partnerData as Papel[]);
      }
    }

    setLoading(false);
  }, [profile, partnerId]);

  useEffect(() => {
    loadPapeis();
  }, [loadPapeis]);

  function handleCreateDone() {
    setShowCreateModal(false);
    loadPapeis();
    onPapeisChanged?.();
  }

  const visiblePapeis = expanded ? papeis : papeis.slice(0, 8);
  const visiblePartnerPapeis = expanded ? partnerPapeis : partnerPapeis.slice(0, 8);

  return (
    <>
      <div className="fixed top-[56px] left-0 right-0 bottom-[80px] z-30 flex flex-col bg-navy-900/98 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/40">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">Catálogo de Papéis</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {}}
              className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center
                         active:scale-90 transition-all duration-150 border border-white/10"
              title="Configurações"
            >
              <Settings size={14} className="text-white/60" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center
                         active:scale-90 transition-all duration-150 border border-white/10"
              title="Fechar"
            >
              <Minus size={14} className="text-white/60" />
            </button>
          </div>
        </div>

        {/* Main content: avatar grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-purple-400" />
            </div>
          ) : papeis.length === 0 && partnerPapeis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center border-2 border-dashed border-white/15">
                <Plus size={28} className="text-white/25" />
              </div>
              <p className="text-white/40 text-sm">Nenhum personagem criado ainda</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-full bg-neon/20 text-neon text-sm font-medium
                           hover:bg-neon/30 active:scale-95 transition-all duration-150
                           border border-neon/30"
              >
                Criar primeiro personagem
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Own roles */}
              <div>
                <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Seus papéis</h3>
                <div className="grid grid-cols-4 gap-4">
                  {/* + button as first item */}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="w-14 h-14 rounded-full bg-navy-800 border-2 border-dashed border-purple-500/40
                                    flex items-center justify-center
                                    group-hover:border-purple-400 group-hover:bg-navy-700
                                    active:scale-95 transition-all duration-200">
                      <Plus size={20} className="text-purple-400/60 group-hover:text-purple-400" />
                    </div>
                    <span className="text-[11px] text-white/40 group-hover:text-white/60">Novo</span>
                  </button>

                  {visiblePapeis.map((papel) => (
                    <div key={papel.id} className="flex flex-col items-center gap-1.5">
                      <div className="relative group">
                        <button
                          onClick={() => setEditingRole(papel)}
                          className="block"
                        >
                          <div
                            className="w-14 h-14 rounded-full overflow-hidden shrink-0
                                       border-[3px] transition-all duration-200
                                       group-active:scale-90 hover:scale-105"
                            style={{
                              borderColor: papel.cor_balao,
                              boxShadow: `0 2px 6px ${papel.cor_balao}30`,
                            }}
                          >
                            {papel.avatar_url ? (
                              <img
                                src={papel.avatar_url}
                                alt={papel.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center text-base font-bold"
                                style={{
                                  backgroundColor: papel.cor_balao,
                                  color: papel.cor_fonte,
                                }}
                              >
                                {papel.nome.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                      <span className="text-[11px] font-medium text-white truncate w-full text-center leading-tight">
                        {papel.nome}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partner roles */}
              {partnerPapeis.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold text-purple-400/60 uppercase tracking-wider mb-2">Papéis do parceiro</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {visiblePartnerPapeis.map((papel) => (
                      <div key={papel.id} className="flex flex-col items-center gap-1.5">
                        <div className="relative group">
                          <button
                            onClick={() => setEditingRole(papel)}
                            className="block"
                          >
                            <div
                              className="w-14 h-14 rounded-full overflow-hidden shrink-0
                                         border-[3px] border-dashed transition-all duration-200
                                         group-active:scale-90 hover:scale-105"
                              style={{
                                borderColor: papel.cor_balao,
                                boxShadow: `0 2px 6px ${papel.cor_balao}30`,
                              }}
                            >
                              {papel.avatar_url ? (
                                <img
                                  src={papel.avatar_url}
                                  alt={papel.nome}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center text-base font-bold"
                                  style={{
                                    backgroundColor: papel.cor_balao,
                                    color: papel.cor_fonte,
                                  }}
                                >
                                  {papel.nome.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </button>
                        </div>
                        <span className="text-[11px] font-medium text-white truncate w-full text-center leading-tight">
                          {papel.nome}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom bar: expand chevron */}
        {(papeis.length > 8 || partnerPapeis.length > 8) && (
          <div className="shrink-0 flex justify-center pb-3 pt-1">
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center
                         active:scale-90 transition-all duration-150 border border-white/10"
              title={expanded ? 'Recolher' : 'Expandir lista'}
            >
              <ChevronDown
                size={16}
                className={`text-white/60 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Create Character Modal */}
      {showCreateModal && (
        <RoleplayCatalog
          papeis={papeis}
          onClose={() => setShowCreateModal(false)}
          onRefresh={handleCreateDone}
        />
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <RoleProfileModal
          role={editingRole}
          currentUserId={profile?.id || ""}
          chatId={chatId}
          onClose={() => setEditingRole(null)}
          onUpdated={() => { setEditingRole(null); loadPapeis(); onPapeisChanged?.(); }}
          onDeleted={() => { setEditingRole(null); loadPapeis(); onPapeisChanged?.(); }}
        />
      )}
    </>
  );
}

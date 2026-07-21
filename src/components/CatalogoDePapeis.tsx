import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Papel } from '../types/database';
import { Plus, ChevronUp, Settings, Sparkles, Loader2, Download } from 'lucide-react';
import RoleplayCatalog from '../screens/RoleplayCatalog';
import RoleProfileModal from './RoleProfileModal';

interface CatalogoDePapeisProps {
  partnerId?: string;
  chatId?: string;
  onPapeisChanged?: () => void;
  onClose: () => void;
  onOpenBastidores?: () => void;
}

export default function CatalogoDePapeis({
  partnerId,
  chatId,
  onPapeisChanged,
  onOpenBastidores,
}: CatalogoDePapeisProps) {
  const { profile } = useAuth();
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [partnerPapeis, setPartnerPapeis] = useState<Papel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingRole, setEditingRole] = useState<Papel | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
    }
    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettingsMenu]);

  function handleCreateDone() {
    setShowCreateModal(false);
    loadPapeis();
    onPapeisChanged?.();
  }

  const visiblePapeis = expanded ? papeis : papeis.slice(0, 8);
  const visiblePartnerPapeis = expanded ? partnerPapeis : partnerPapeis.slice(0, 8);

  return (
    <>
      <div
        className="fixed inset-x-0 top-16 z-40 bg-navy-900/95 backdrop-blur-xl border-b border-accent-500/20 overflow-y-auto transition-all duration-300 rounded-b-3xl"
        style={{ height: expanded ? '85vh' : '50vh' }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-accent-500/10">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent-400" />
            <h2 className="text-xs font-bold text-white tracking-wide">Catálogo de Papéis</h2>
          </div>
          <div className="flex items-center gap-1.5 relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettingsMenu(prev => !prev)}
              className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center
                         active:scale-90 transition-all duration-150 border border-white/10"
              title="Configurações"
            >
              <Settings size={13} className="text-white/60" />
            </button>

            {showSettingsMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-navy-800 border border-white/10 rounded-xl shadow-xl shadow-black/40 overflow-hidden min-w-[180px]">
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onOpenBastidores?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 hover:bg-navy-700 transition text-left"
                >
                  <Download size={15} className="text-accent-400" />
                  Importar personagens
                </button>
              </div>
            )}

            <button
              onClick={() => setExpanded(prev => !prev)}
              className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center
                         active:scale-90 transition-all duration-150 border border-white/10"
              title={expanded ? 'Recolher' : 'Expandir'}
            >
              <ChevronUp
                size={13}
                className={`text-white/60 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-accent-400" />
            </div>
          ) : papeis.length === 0 && partnerPapeis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-navy-800 flex items-center justify-center border-2 border-dashed border-white/15">
                <Plus size={20} className="text-white/25" />
              </div>
              <p className="text-white/40 text-xs">Nenhum personagem criado ainda</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 rounded-full bg-neon/20 text-neon text-xs font-medium
                           hover:bg-neon/30 active:scale-95 transition-all duration-150
                           border border-neon/30"
              >
                Criar primeiro personagem
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Seus papéis</h3>
                <div className="grid grid-cols-4 gap-4">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className="w-16 h-16 rounded-full bg-navy-800 border-2 border-dashed border-accent-500/30
                                    flex items-center justify-center
                                    group-hover:border-accent-400 group-hover:bg-navy-700
                                    active:scale-95 transition-all duration-200">
                      <Plus size={24} className="text-accent-400/60 group-hover:text-accent-400" />
                    </div>
                    <span className="text-[11px] text-white/40 group-hover:text-white/60">Novo</span>
                  </button>

                  {visiblePapeis.map((papel) => (
                    <button key={papel.id}
                      onClick={() => setEditingRole(papel)}
                      className="flex flex-col items-center gap-1.5"
                      style={{ opacity: papel.equipado ? 1 : 0.5 }}>
                      <div
                        className="w-16 h-16 rounded-full overflow-hidden shrink-0
                                   border-[3px] transition-all duration-200
                                   active:scale-90 hover:scale-105"
                        style={{
                          borderColor: papel.cor_balao,
                          boxShadow: `0 2px 6px ${papel.cor_balao}30`,
                        }}
                      >
                        {papel.avatar_url ? (
                          <img src={papel.avatar_url} alt={papel.nome} className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-lg font-bold"
                            style={{ backgroundColor: papel.cor_balao, color: papel.cor_fonte }}
                          >
                            {papel.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-white truncate leading-tight">
                        {papel.nome}
                      </span>
                    </button>
                    ))}
                 </div>
               </div>

                {partnerPapeis.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-semibold text-accent-400/60 uppercase tracking-wider mb-1.5">Papéis do parceiro</h3>
                    <div className="grid grid-cols-4 gap-4">
                       {visiblePartnerPapeis.map((papel) => (
                         <button key={papel.id}
                           onClick={() => setEditingRole(papel)}
                           className="flex flex-col items-center gap-1.5"
                           style={{ opacity: papel.equipado ? 1 : 0.5 }}>
                           <div
                             className="w-16 h-16 rounded-full overflow-hidden shrink-0
                                        border-[3px] border-dashed transition-all duration-200
                                        active:scale-90 hover:scale-105"
                             style={{
                               borderColor: papel.cor_balao,
                               boxShadow: `0 2px 6px ${papel.cor_balao}30`,
                             }}
                           >
                             {papel.avatar_url ? (
                               <img src={papel.avatar_url} alt={papel.nome} className="w-full h-full object-cover" />
                             ) : (
                               <div
                                 className="w-full h-full flex items-center justify-center text-lg font-bold"
                                 style={{ backgroundColor: papel.cor_balao, color: papel.cor_fonte }}
                               >
                                 {papel.nome.charAt(0).toUpperCase()}
                               </div>
                             )}
                           </div>
                           <span className="text-xs font-medium text-white truncate leading-tight">
                             {papel.nome}
                           </span>
                         </button>
                       ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {createPortal(
        <>
          {showCreateModal && (
            <RoleplayCatalog
              papeis={papeis}
              onClose={() => setShowCreateModal(false)}
              onRefresh={handleCreateDone}
            />
          )}

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
        </>,
        document.body
      )}
    </>
  );
}

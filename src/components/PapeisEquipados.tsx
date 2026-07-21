import { useEffect, useRef } from 'react';
import type { Papel } from '../types/database';

interface PapeisEquipadosProps {
  equippedPapeis: Papel[];
  activePapel: Papel | null;
  onSelectPapel: (papel: Papel) => void;
  onOpenProfile: (papel: Papel) => void;
  onClose: () => void;
}

export default function PapeisEquipados({
  equippedPapeis,
  activePapel,
  onSelectPapel,
  onOpenProfile,
  onClose,
}: PapeisEquipadosProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40">
      <div
        ref={panelRef}
        className="bg-navy-800 border-t border-white/10 rounded-t-2xl shadow-2xl shadow-black/50 max-h-[60vh] flex flex-col"
      >
        <div className="px-5 py-3 border-b border-white/5 shrink-0">
          <h3 className="text-sm font-bold text-white/80 text-center">Papeis equipados</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {equippedPapeis.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-6">Nenhum papel equipado</p>
          ) : (
            equippedPapeis.map((papel) => {
              const isActive = activePapel?.id === papel.id;
              return (
                <div key={papel.id} className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenProfile(papel)}
                    className="shrink-0 w-11 h-11 rounded-full overflow-hidden border-2 active:scale-90 transition"
                    style={{ borderColor: papel.cor_balao }}
                  >
                    {papel.avatar_url ? (
                      <img src={papel.avatar_url} alt={papel.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: papel.cor_balao, color: papel.cor_fonte }}
                      >
                        {papel.nome.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => { onSelectPapel(papel); onClose(); }}
                    className={`flex-1 h-11 rounded-full text-sm font-medium transition-all active:scale-95 ${
                      isActive
                        ? 'bg-neon text-white shadow-lg shadow-accent-500/30'
                        : 'bg-navy-700 text-white/70 hover:bg-navy-600 border border-white/10'
                    }`}
                  >
                    {papel.nome}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

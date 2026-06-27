import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { sanitizeHexColor } from '../lib/sanitize';
import type { Usuario, Mensagem, Papel, ConfigChat } from '../types/database';
import { ArrowLeft, Send, Loader2, Theater, BookOpen, ImageIcon } from 'lucide-react';
import RoleplayCatalog from './RoleplayCatalog';
import BackgroundSettings from './BackgroundSettings';

export default function ChatScreen({ chatId, partner, onBack }: { chatId: string; partner: Usuario; onBack: () => void }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [partnerPapeis, setPartnerPapeis] = useState<Papel[]>([]);
  const [equippedPapeis, setEquippedPapeis] = useState<Papel[]>([]);
  const [roleplayMode, setRoleplayMode] = useState(false);
  const [activePapel, setActivePapel] = useState<Papel | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showBgSettings, setShowBgSettings] = useState(false);
  const [config, setConfig] = useState<ConfigChat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load messages
  const loadMessages = useCallback(async () => {
    const { data, error: msgError } = await supabase
      .from('mensagens')
      .select(`
        *,
        papel:papeis(*),
        sender:usuarios!sender_id(*)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Failed to load messages:', msgError.message);
      setError('Erro ao carregar mensagens');
    } else if (data) {
      setMessages(data as unknown as Mensagem[]);
    }
    setLoading(false);
  }, [chatId]);

  // Load papeis
  const loadPapeis = useCallback(async () => {
    if (!profile) return;
    const { data, error: papeisError } = await supabase
      .from('papeis')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (papeisError) {
      console.error('Failed to load papeis:', papeisError.message);
    } else if (data) {
      setPapeis(data as Papel[]);
      setEquippedPapeis((data as Papel[]).filter((p) => p.equipado));
    }

    // Load partner's papeis
    const { data: partnerData, error: partnerPapeisError } = await supabase
      .from('papeis')
      .select('*')
      .eq('user_id', partner.id);

    if (partnerPapeisError) {
      console.error('Failed to load partner papeis:', partnerPapeisError.message);
    } else if (partnerData) {
      setPartnerPapeis(partnerData as Papel[]);
    }
  }, [profile, partner.id]);

  // Load config
  const loadConfig = useCallback(async () => {
    if (!profile) return;
    const { data, error: configError } = await supabase
      .from('config_chat')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (configError) {
      console.error('Failed to load chat config:', configError.message);
    } else if (data) {
      setConfig(data as ConfigChat);
    }
  }, [chatId, profile]);

  useEffect(() => {
    loadMessages();
    loadPapeis();
    loadConfig();
  }, [loadMessages, loadPapeis, loadConfig]);

  // Sync activePapel with equippedPapeis changes
  useEffect(() => {
    if (roleplayMode && equippedPapeis.length > 0) {
      // If no activePapel or current activePapel is no longer equipped, select first equipped
      if (!activePapel || !equippedPapeis.some(p => p.id === activePapel.id)) {
        setActivePapel(equippedPapeis[0]);
      }
    } else if (equippedPapeis.length === 0) {
      setActivePapel(null);
    }
  }, [equippedPapeis, roleplayMode, activePapel]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`mensagens:${chatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMsg = payload.new as Mensagem;
          if (!messages.some((m) => m.id === newMsg.id)) {
            // Fetch the full message with joins
            (async () => {
              const { data, error: fetchError } = await supabase
                .from('mensagens')
                .select(`*, papel:papeis(*), sender:usuarios!sender_id(*)`)
                .eq('id', newMsg.id)
                .maybeSingle();
              if (fetchError) {
                console.error('Failed to fetch new message:', fetchError.message);
                return;
              }
              if (data) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === data.id)) return prev;
                  return [...prev, data as unknown as Mensagem];
                });
              }
            })();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, messages]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const MAX_MESSAGE_LENGTH = 5000;

  async function handleSend() {
    if (!input.trim() || !profile || sending) return;
    const texto = input.trim();
    if (texto.length > MAX_MESSAGE_LENGTH) {
      alert(`Mensagem muito longa (máx. ${MAX_MESSAGE_LENGTH} caracteres).`);
      return;
    }
    setSending(true);
    setError(null);
    setInput('');

    const insertData: Record<string, unknown> = {
      chat_id: chatId,
      sender_id: profile.id,
      texto,
    };

    if (roleplayMode && activePapel) {
      insertData.papel_id = activePapel.id;
    }

    const { data, error: sendError } = await supabase
      .from('mensagens')
      .insert(insertData)
      .select(`*, papel:papeis(*), sender:usuarios!sender_id(*)`)
      .single();

    if (sendError) {
      console.error('Failed to send message:', sendError.message);
      setError('Erro ao enviar mensagem');
      setInput(texto);
    } else if (data) {
      setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data as unknown as Mensagem]);
    }
    setSending(false);
  }

  function handlePapeisUpdated() {
    loadPapeis();
  }

  function handleConfigUpdated(newConfig: ConfigChat) {
    setConfig(newConfig);
  }

  function toggleRoleplay() {
    setRoleplayMode((prev) => {
      const next = !prev;
      if (!next) setActivePapel(null);
      else if (equippedPapeis.length > 0 && !activePapel) {
        setActivePapel(equippedPapeis[0]);
      }
      return next;
    });
  }

  const bgOpacity = config?.background_opacity ?? 0.5;
  const bgUrl = config?.background_url;

  return (
    <div className="h-screen flex flex-col bg-navy-800 overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-navy-700 z-20 shrink-0">
        <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition">
          <ArrowLeft size={20} className="text-white/70" />
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-navy-600 flex items-center justify-center font-bold shrink-0">
            {partner.display_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate leading-tight">{partner.display_name}</p>
            <p className="text-white/40 text-xs truncate">@{partner.username}</p>
          </div>
        </div>

        {/* Roleplay toggle */}
        <button
          onClick={toggleRoleplay}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90 ${
            roleplayMode ? 'bg-neon text-white' : 'bg-navy-600 text-white/50'
          }`}
          title="Modo Encenação"
        >
          <Theater size={18} />
        </button>

        {/* Catalog */}
        <button
          onClick={() => setShowCatalog(true)}
          className="w-10 h-10 rounded-full bg-navy-600 flex items-center justify-center active:scale-90 transition"
          title="Catálogo de Papéis"
        >
          <BookOpen size={18} className="text-white/70" />
        </button>

        {/* Background settings */}
        <button
          onClick={() => setShowBgSettings(true)}
          className="w-10 h-10 rounded-full bg-navy-600 flex items-center justify-center active:scale-90 transition"
          title="Personalizar Fundo"
        >
          <ImageIcon size={18} className="text-white/70" />
        </button>
      </header>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        {/* Background layer (z-0) */}
        {bgUrl && (
          <div className="absolute inset-0 z-0">
            <img src={bgUrl} alt="" className="w-full h-full object-cover" />
            <div
              className="absolute inset-0 bg-navy-800"
              style={{ opacity: bgOpacity }}
            />
          </div>
        )}

        {/* Messages (z-10) */}
        <div className="relative z-10 px-4 py-4 space-y-2 min-h-full">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-2xl px-4 py-2.5 mb-2">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-neon" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-white/30">Nenhuma mensagem ainda</p>
              <p className="text-white/20 text-sm mt-1">Diga olá!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === profile?.id;
              // Try papel from join first, then fallback to combined local papeis arrays
              const allPapeis = [...papeis, ...partnerPapeis];
              const papel = msg.papel || (msg.papel_id ? allPapeis.find(p => p.id === msg.papel_id) : null) || null;
              const isRoleplay = !!msg.papel_id && !!papel;
              const safeBg = papel ? sanitizeHexColor(papel.cor_balao, '#8A2BE2') : '#8A2BE2';
              const safeFg = papel ? sanitizeHexColor(papel.cor_fonte, '#FFFFFF') : '#FFFFFF';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  {isRoleplay && papel?.avatar_url ? (
                    <img
                      src={papel.avatar_url}
                      alt={papel.nome}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border-2"
                      style={{ borderColor: safeBg }}
                    />
                  ) : isRoleplay && papel ? (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2"
                      style={{
                        backgroundColor: safeBg,
                        borderColor: safeBg,
                        color: safeFg,
                      }}
                    >
                      {papel.nome.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-navy-600 flex items-center justify-center text-sm font-bold shrink-0">
                      {(isMine ? profile?.display_name : partner.display_name)?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    {isRoleplay && papel && (
                      <span
                        className="text-xs mb-0.5 px-1"
                        style={{ color: safeBg, opacity: 0.7, fontFamily: 'inherit' }}
                      >
                        {papel.nome}
                      </span>
                    )}
                    <div
                      className="rounded-3xl px-4 py-2.5"
                      style={
                        isRoleplay && papel
                          ? { backgroundColor: safeBg, color: safeFg }
                          : isMine
                            ? { backgroundColor: '#8A2BE2', color: '#FFFFFF' }
                            : { backgroundColor: '#1A1C2D', color: '#FFFFFF' }
                      }
                    >
                      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ fontFamily: 'inherit' }}>{msg.texto}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Roleplay bar */}
      {roleplayMode && (
        <div className="bg-navy-700 px-3 py-2 z-20 shrink-0">
          {equippedPapeis.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-1">
              Nenhum papel equipado. Abra o catálogo para equipar.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {equippedPapeis.map((papel) => {
                const bg = sanitizeHexColor(papel.cor_balao, '#8A2BE2');
                const fg = sanitizeHexColor(papel.cor_fonte, '#FFFFFF');
                return (
                <button
                  key={papel.id}
                  onClick={() => setActivePapel(papel)}
                  className={`flex flex-col items-center gap-1 shrink-0 transition ${
                    activePapel?.id === papel.id ? 'scale-105' : 'opacity-70'
                  }`}
                >
                  {papel.avatar_url ? (
                    <img
                      src={papel.avatar_url}
                      alt={papel.nome}
                      className="w-12 h-12 rounded-full object-cover border-2"
                      style={{
                        borderColor: activePapel?.id === papel.id ? bg : 'transparent',
                      }}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2"
                      style={{
                        backgroundColor: bg,
                        color: fg,
                        borderColor: activePapel?.id === papel.id ? bg : 'transparent',
                      }}
                    >
                      {papel.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-white/60 max-w-[60px] truncate">{papel.nome}</span>
                </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-navy-700 z-20 shrink-0">
        <div className="flex gap-2 items-end">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder={roleplayMode && activePapel ? `Como ${activePapel.nome}...` : 'Mensagem...'}
            className="input-pill flex-1"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-12 h-12 rounded-full bg-neon flex items-center justify-center shrink-0 active:scale-90 transition disabled:opacity-40"
          >
            {sending ? <Loader2 size={20} className="animate-spin text-white" /> : <Send size={20} className="text-white" />}
          </button>
        </div>
      </div>

      {/* Catalog Modal */}
      {showCatalog && (
        <RoleplayCatalog
          papeis={papeis}
          onClose={() => setShowCatalog(false)}
          onPapeisChanged={handlePapeisUpdated}
        />
      )}

      {/* Background Settings Modal */}
      {showBgSettings && (
        <BackgroundSettings
          chatId={chatId}
          config={config}
          onClose={() => setShowBgSettings(false)}
          onConfigUpdated={handleConfigUpdated}
        />
      )}
    </div>
  );
}

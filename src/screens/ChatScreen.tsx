import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Usuario, Mensagem, Papel, ConfigChat } from '../types/database';
import { ArrowLeft, Send, Loader2, Theater, ImageIcon, MapPinned, X, Users } from 'lucide-react';
import BackgroundSettings from './BackgroundSettings';
import RoleProfileModal from '../components/RoleProfileModal';
import CatalogoDePapeis from '../components/CatalogoDePapeis';
import PapeisEquipados from '../components/PapeisEquipados';
import ConfirmModal from '../components/ConfirmModal';
import BastidoresView from '../components/BastidoresView';

export default function ChatScreen({ chatId, partner, onBack }: { chatId: string; partner: Usuario; onBack: () => void }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [partnerPapeis, setPartnerPapeis] = useState<Papel[]>([]);
  const [equippedPapeis, setEquippedPapeis] = useState<Papel[]>([]);
  const [roleplayMode, setRoleplayMode] = useState(() => {
    return localStorage.getItem(`roleplay_${chatId}`) === 'true';
  });
  const [activePapel, setActivePapel] = useState<Papel | null>(null);
  const [showBgSettings, setShowBgSettings] = useState(false);
  const [config, setConfig] = useState<ConfigChat | null>(null);
  const [pinnedNotes, setPinnedNotes] = useState<{id: string, title: string, description: string}[]>([]);
  const [isPinnedLoreOpen, setIsPinnedLoreOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteTitleInput, setNoteTitleInput] = useState('');
  const [noteDescriptionInput, setNoteDescriptionInput] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [selectedProfileRole, setSelectedProfileRole] = useState<any | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showPapeisEquipados, setShowPapeisEquipados] = useState(false);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(false);
  const [showBastidores, setShowBastidores] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleSaveNote = async () => {
    if (!chatId) return;
    
    if (!noteTitleInput.trim()) {
      console.log('Title is empty, not saving');
      return;
    }
    
    const newNote = {
      title: noteTitleInput.trim(),
      description: noteDescriptionInput.trim(),
      conversation_id: chatId,
    };
    
    console.log('Saving note:', newNote);
    
    const { data, error } = await supabase
      .from('pinned_notes')
      .insert([newNote])
      .select();
    
    if (error) {
      console.error('Supabase error:', error.message);
      alert('Erro ao salvar nota: ' + error.message);
      return;
    }
    
    if (data && data[0]) {
      setPinnedNotes(prev => [...prev, data[0]]);
      console.log('Note saved successfully:', data[0]);
      
      setNoteTitleInput('');
      setNoteDescriptionInput('');
      setIsAddNoteOpen(false);
    }
  };
  
  const handleDeleteNote = async () => {
    if (!selectedNoteId) return;
    
    console.log('Deleting note:', selectedNoteId);
    
    const { error } = await supabase
      .from('pinned_notes')
      .delete()
      .eq('id', selectedNoteId);
    
    if (error) {
      console.error('Error deleting:', error.message);
      alert('Erro ao deletar nota: ' + error.message);
      return;
    }
    
    setPinnedNotes(pinnedNotes.filter(note => note.id !== selectedNoteId));
    setSelectedNoteId(null);
    console.log('Note deleted successfully');
  };

  // Load messages
  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('mensagens')
      .select(`
        *,
        papel:papeis(*),
        sender:usuarios!sender_id(*)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as unknown as Mensagem[]);
    setLoading(false);
  }, [chatId]);

  // Load papeis
  const loadPapeis = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('papeis')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (data) {
      setPapeis(data as Papel[]);
    }

    // Load partner's papeis
    const { data: partnerData } = await supabase
      .from('papeis')
      .select('*')
      .eq('user_id', partner.id);

    if (partnerData) {
      setPartnerPapeis(partnerData as Papel[]);
    }

    // Combine equipped from both users
    const ownEquipped = (data as Papel[] || []).filter((p) => p.equipado);
    const partnerEquipped = (partnerData as Papel[] || []).filter((p) => p.equipado);
    setEquippedPapeis([...ownEquipped, ...partnerEquipped]);
  }, [profile, partner.id]);

  // Load config
  const loadConfig = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('config_chat')
      .select('*')
      .eq('chat_id', chatId)
      .order('id', { ascending: false })
      .limit(1);

    if (data && data.length > 0) setConfig(data[0] as ConfigChat);
    else setConfig(null);
  }, [chatId, profile]);

  useEffect(() => {
    loadMessages();
    loadPapeis();
    loadConfig();
  }, [loadMessages, loadPapeis, loadConfig]);

  useEffect(() => {
    const loadPinnedNotes = async () => {
      setIsLoadingNotes(true);
      const { data, error } = await supabase
        .from('pinned_notes')
        .select('id, title, description')
        .eq('conversation_id', chatId)
        .order('created_at', { ascending: false });
      
      setIsLoadingNotes(false);
      
      if (!error && data) {
        setPinnedNotes(data);
      } else if (error) {
        console.error('Error loading notes:', error);
      }
    };
    
    if (chatId) {
      loadPinnedNotes();
    }
  }, [chatId]);

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
              const { data } = await supabase
                .from('mensagens')
                .select(`*, papel:papeis(*), sender:usuarios!sender_id(*)`)
                .eq('id', newMsg.id)
                .maybeSingle();
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

  async function handleSend() {
    if (!input.trim() || !profile || sending) return;
    setSending(true);
    const texto = input.trim();
    setInput('');

    const insertData: Record<string, unknown> = {
      chat_id: chatId,
      sender_id: profile.id,
      texto,
    };

    console.log('[handleSend] roleplayMode:', roleplayMode);
    console.log('[handleSend] activePapel:', activePapel);

    if (roleplayMode && activePapel) {
      insertData.papel_id = activePapel.id;
      console.log('[handleSend] Sending with papel_id:', activePapel.id);
    }

    const { data, error } = await supabase
      .from('mensagens')
      .insert(insertData)
      .select(`*, papel:papeis(*), sender:usuarios!sender_id(*)`)
      .single();

    if (!error && data) {
      setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data as unknown as Mensagem]);
    }
    setSending(false);
  }

  function insertShortcut(prefix: string, open?: string, close?: string) {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const selected = input.substring(start, end);
    let newText: string;
    let cursorOffset: number;
    if (open && close) {
      newText = input.substring(0, start) + open + selected + close + input.substring(end);
      cursorOffset = start + open.length + selected.length;
    } else {
      newText = input.substring(0, start) + prefix + selected + input.substring(end);
      cursorOffset = start + prefix.length + selected.length;
    }
    setInput(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(cursorOffset, cursorOffset);
    }, 0);
  }

  function darkenHex(hex: string, factor: number): string {
    const h = hex.replace('#', '');
    const r = Math.round(parseInt(h.substring(0, 2), 16) * factor);
    const g = Math.round(parseInt(h.substring(2, 4), 16) * factor);
    const b = Math.round(parseInt(h.substring(4, 6), 16) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function renderFormattedText(text: string) {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      let style: React.CSSProperties = {};
      let content = line;

      if (line.startsWith('//')) {
        content = line;
        style = {};
      } else if (line.startsWith('>')) {
        const inner = line.slice(1).trim();
        return (
          <span key={i}>
            {i > 0 && <br />}
            <span
              className="inline-block w-full rounded-xl py-1.5 px-3 my-1 text-sm leading-relaxed"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#FFFFFF',
                fontWeight: 'bold',
                fontStyle: 'italic',
              }}
            >
              {inner}
            </span>
          </span>
        );
      } else if (line.startsWith('—')) {
        content = line;
        style = { fontStyle: 'italic' };
      } else if (line.startsWith('*') && line.endsWith('*')) {
        const inner = line.slice(1, -1);
        return (
          <span key={i}>
            {i > 0 && <br />}
            <span style={{ fontWeight: 'bold', fontStyle: 'italic' }}>{inner}</span>
          </span>
        );
      } else if (line.startsWith('((') && line.endsWith('))')) {
        const inner = line.slice(2, -2);
        return (
          <span key={i}>
            {i > 0 && <br />}
            <span>{'(('}</span>
            <span style={{ fontWeight: 'bold', paddingLeft: '0.25em', paddingRight: '0.25em' }}>{inner}</span>
            <span>{'))'}</span>
          </span>
        );
      }

      return (
        <span key={i}>
          {i > 0 && <br />}
          <span style={style}>{content}</span>
        </span>
      );
    });
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
      localStorage.setItem(`roleplay_${chatId}`, String(next));
      if (!next) {
        setActivePapel(null);
        setShowCatalog(false);
      }
      else if (equippedPapeis.length > 0 && !activePapel) {
        setActivePapel(equippedPapeis[0]);
      }
      return next;
    });
  }

  const bgOpacity = config?.background_opacity ?? 0.5;
  const bgUrl = config?.background_url;

  // Debug: verificar estado do roleplay
  console.log('[ChatScreen] roleplayMode:', roleplayMode);
  console.log('[ChatScreen] activePapel:', activePapel);
  console.log('[ChatScreen] equippedPapeis:', equippedPapeis);

  // Close detail modal if selected note disappears
  useEffect(() => {
    if (selectedNoteId && !pinnedNotes.some(n => n.id === selectedNoteId)) {
      setSelectedNoteId(null);
    }
  }, [pinnedNotes, selectedNoteId]);

  return (
    <div className="h-screen flex flex-col bg-navy-800 overflow-hidden">
      <style>{`
        .avatar-overlay-50::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 9999px;
          pointer-events: none;
        }
        .avatar-overlay-75::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.75);
          border-radius: 9999px;
          pointer-events: none;
        }
      `}</style>
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

          {/* Pinned Lore */}
          <button
            onClick={() => setIsPinnedLoreOpen(true)}
            className="w-10 h-10 rounded-full bg-navy-600 flex items-center justify-center active:scale-90 transition"
            title="Notas Fixas"
          >
            <MapPinned size={20} className="text-white/70" />
          </button>

          {/* Catalog button */}
          <button
            onClick={() => setShowCatalog(prev => !prev)}
            className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition ${
              showCatalog ? 'bg-neon text-white' : 'bg-navy-600 text-white/50'
            }`}
            title="Catálogo de Papéis"
          >
            <Users size={18} />
          </button>

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

        {/* Background settings */}
        <button
          onClick={() => setShowBgSettings(true)}
          className="w-10 h-10 rounded-full bg-navy-600 flex items-center justify-center active:scale-90 transition"
          title="Personalizar Fundo"
        >
          <ImageIcon size={18} className="text-white/70" />
        </button>
      </header>

      {/* Catálogo de Papéis — inline below header */}
      {showCatalog && (
        <CatalogoDePapeis
          partnerId={partner.id}
          chatId={chatId}
          onPapeisChanged={handlePapeisUpdated}
          onClose={() => setShowCatalog(false)}
          onOpenBastidores={() => { setShowCatalog(false); setShowBastidores(true); }}
        />
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative" onClick={() => { if (showCatalog) setShowCatalog(false); }}>
        {/* Background layer (z-0) */}
        {bgUrl && (
          <div className="fixed inset-0 z-0">
            <img src={bgUrl} alt="" className="w-full h-full object-cover" />
            <div
              className="absolute inset-0 bg-navy-800"
              style={{ opacity: bgOpacity }}
            />
          </div>
        )}

        {/* Messages (z-10) */}
        <div className="relative z-10 px-4 py-4 space-y-2 min-h-full">
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

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  {isRoleplay && papel?.avatar_url ? (
                    <span
                      onClick={() => setSelectedProfileRole(papel)}
                      className="cursor-pointer shrink-0"
                    >
                      <img
                        src={papel.avatar_url}
                        alt={papel.nome}
                        className="w-11 h-11 rounded-full object-cover border-2"
                        style={{ borderColor: papel.cor_balao }}
                      />
                    </span>
                  ) : isRoleplay && papel ? (
                    <span
                      onClick={() => setSelectedProfileRole(papel)}
                      className="cursor-pointer shrink-0"
                    >
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold border-2"
                        style={{
                          backgroundColor: papel.cor_balao,
                          borderColor: papel.cor_balao,
                          color: papel.cor_fonte,
                        }}
                      >
                        {papel.nome.charAt(0).toUpperCase()}
                      </div>
                    </span>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-navy-600 flex items-center justify-center text-sm font-bold shrink-0">
                      {(isMine ? profile?.display_name : partner.display_name)?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    {isRoleplay && papel && (
                      <span
                        className="text-sm font-bold italic mb-0.5 px-1"
                        style={{ color: papel.cor_balao, fontFamily: 'inherit' }}
                      >
                        {papel.nome}
                      </span>
                    )}
                    <div
                      className="rounded-3xl px-4 py-2.5"
                      style={
                        msg.texto.startsWith('>')
                          ? { backgroundColor: 'rgba(0, 0, 0, 0.7)', color: '#FFFFFF' }
                          : isRoleplay && papel
                            ? { backgroundColor: msg.texto.startsWith('//') ? darkenHex(papel.cor_balao, 0.45) : papel.cor_balao, color: papel.cor_fonte }
                            : isMine
                              ? { backgroundColor: msg.texto.startsWith('//') ? darkenHex('#8A2BE2', 0.45) : '#8A2BE2', color: '#FFFFFF' }
                              : { backgroundColor: msg.texto.startsWith('//') ? darkenHex('#1A1C2D', 0.45) : '#1A1C2D', color: '#FFFFFF' }
                      }
                    >
                      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ fontFamily: 'inherit' }}>{renderFormattedText(msg.texto)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom area */}
      <div className="ml-1 mr-1 mb-2 z-20 shrink-0 flex flex-row items-center gap-5 max-w-full">
        {/* Left element: glowing orb button with active papel avatar */}
        {roleplayMode && equippedPapeis.length > 0 && (
          <button
            onClick={() => setShowPapeisEquipados(true)}
            className="h-14 w-14 shrink-0 flex items-center justify-center bg-navy-700 rounded-full relative active:scale-95 transition
                       border-2 border-neon shadow-lg shadow-purple-500/30 mt-8 translate-x-2"
            title="Trocar papel"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center
                           bg-gradient-to-br from-neon-light to-neon-dark glow-purple-sm">
              {activePapel?.avatar_url ? (
                <img src={activePapel.avatar_url} alt={activePapel.nome} className="w-full h-full object-cover" />
              ) : activePapel ? (
                <span className="text-white text-lg font-bold">{activePapel.nome.charAt(0).toUpperCase()}</span>
              ) : null}
            </div>
          </button>
        )}

        {/* Right element: input capsule */}
        <div className="flex-1 flex flex-col gap-1 min-w-0 overflow-visible">
            {/* Shortcut bar */}
            <div className="flex gap-2 px-0 overflow-x-auto no-scrollbar ml-4">
              <button onClick={() => insertShortcut('— ')} className="shrink-0 px-3 py-1.5 text-xs rounded-full bg-navy-800 text-white/60 hover:text-white hover:bg-navy-600 active:scale-95 transition border border-white/5">
                — Speech
              </button>
              <button onClick={() => insertShortcut('* ', '* ', ' *')} className="shrink-0 px-3 py-1.5 text-xs rounded-full bg-navy-800 text-white/60 hover:text-white hover:bg-navy-600 active:scale-95 transition border border-white/5">
                * Action
              </button>
              <button onClick={() => insertShortcut('(())', '(( ', ' ))')} className="shrink-0 px-3 py-1.5 text-xs rounded-full bg-navy-800 text-white/60 hover:text-white hover:bg-navy-600 active:scale-95 transition border border-white/5">
                (( Thought ))
              </button>
              <button onClick={() => insertShortcut('// ')} className="shrink-0 px-3 py-1.5 text-xs rounded-full bg-navy-800 text-white/60 hover:text-white hover:bg-navy-600 active:scale-95 transition border border-white/5">
                // Off Topic
              </button>
              <button onClick={() => insertShortcut('> ')} className="shrink-0 px-3 py-1.5 text-xs rounded-full bg-navy-800 text-white/60 hover:text-white hover:bg-navy-600 active:scale-95 transition border border-white/5">
                {'>'} Narrador
              </button>
            </div>
            {/* Input */}
            <div className="bg-navy-700 rounded-3xl px-4 py-1 flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={roleplayMode && activePapel ? `Como ${activePapel.nome}...` : 'Mensagem...'}
                className="input-pill flex-1 min-w-0 pl-4"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-11 h-11 rounded-full bg-neon flex items-center justify-center shrink-0 active:scale-90 transition disabled:opacity-40 ml-4 translate-x-2"
              >
                {sending ? (
                  <Loader2 size={20} className="animate-spin text-white" />
                ) : (
                  <Send size={20} className="text-white" />
                )}
              </button>
            </div>
          </div>
      </div>

      {/* Papeis Equipados — bottom panel via glowing orb */}
      {showPapeisEquipados && (
        <PapeisEquipados
          equippedPapeis={equippedPapeis}
          activePapel={activePapel}
          onSelectPapel={(papel) => setActivePapel(papel)}
          onOpenProfile={(papel) => setSelectedProfileRole(papel)}
          onClose={() => setShowPapeisEquipados(false)}
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

      {/* Pinned Lore Panel */}
      {isPinnedLoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsPinnedLoreOpen(false)}>
          <div
            className="w-full sm:max-w-md bg-navy-700 rounded-t-[2rem] sm:rounded-[2rem] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="text-lg font-bold">Notas Fixas</h2>
              <button onClick={() => setIsPinnedLoreOpen(false)} className="w-9 h-9 rounded-full bg-navy-600 flex items-center justify-center active:scale-90 transition">
                <X size={18} className="text-white/60" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {isLoadingNotes ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 size={24} className="animate-spin text-neon mb-4" />
                  <p className="text-white/40">Carregando notas...</p>
                </div>
              ) : pinnedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <MapPinned size={40} className="text-white/20 mb-4" />
                  <p className="text-white/40">Nenhuma nota ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pinnedNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className="bg-navy-800 rounded-2xl p-4 cursor-pointer hover:opacity-80 transition"
                    >
                      <p className="text-white">{note.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5">
              <button
                onClick={() => setIsAddNoteOpen(true)}
                className="w-full h-12 rounded-3xl bg-neon text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition"
              >
                + Adicionar nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Form */}
      {isAddNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setIsAddNoteOpen(false); setNoteTitleInput(''); setNoteDescriptionInput(''); }}>
          <div
            className="w-full sm:max-w-md bg-navy-700 rounded-t-[2rem] sm:rounded-[2rem] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="text-lg font-bold">Adicionar nota</h2>
              <button onClick={() => { setIsAddNoteOpen(false); setNoteTitleInput(''); setNoteDescriptionInput(''); }} className="w-9 h-9 rounded-full bg-navy-600 flex items-center justify-center active:scale-90 transition">
                <X size={18} className="text-white/60" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <label className="block text-white/50 text-sm mb-2">Título da nota</label>
                <input
                  type="text"
                  value={noteTitleInput}
                  onChange={(e) => setNoteTitleInput(e.target.value)}
                  placeholder="Ex: Local da história"
                  className="w-full px-4 py-3 rounded-xl bg-navy-600 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-neon/50"
                />
                {noteTitleInput.trim() === '' && (
                  <p className="text-red-400 text-sm mt-2">O título é obrigatório</p>
                )}
              </div>

              <div>
                <label className="block text-white/50 text-sm mb-2">Descrição (opcional)</label>
                <textarea
                  value={noteDescriptionInput}
                  onChange={(e) => setNoteDescriptionInput(e.target.value)}
                  placeholder="Ex: A história se passa no castelo de gelo"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-navy-600 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-neon/50 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5">
              <button
                onClick={handleSaveNote}
                className="w-full h-12 rounded-3xl bg-neon text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Detail Modal */}
      {selectedNoteId && (() => {
        const selectedNote = pinnedNotes.find(note => note.id === selectedNoteId);
        if (!selectedNote) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedNoteId(null)}>
            <div
              className="w-full sm:max-w-md bg-navy-700 rounded-t-[2rem] sm:rounded-[2rem] max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h2 className="text-lg font-bold truncate flex-1 mr-3">{selectedNote.title}</h2>
                <button onClick={() => setSelectedNoteId(null)} className="w-9 h-9 rounded-full bg-navy-600 flex items-center justify-center active:scale-90 transition shrink-0">
                  <X size={18} className="text-white/60" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5">
                {selectedNote.description ? (
                  <p className="text-white/70 leading-relaxed whitespace-pre-wrap break-words">{selectedNote.description}</p>
                ) : (
                  <p className="text-white/30 italic">Sem descrição</p>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setSelectedNoteId(null)}
                className="flex-1 h-12 rounded-3xl bg-navy-600 text-white/70 font-medium flex items-center justify-center gap-2 active:scale-95 transition"
              >
                Fechar
              </button>
              <button
                onClick={() => setConfirmDeleteNote(true)}
                className="flex-1 h-12 rounded-3xl bg-red-600 text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition"
              >
                Deletar
              </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Role Profile Modal */}
      {selectedProfileRole && (
        <RoleProfileModal
          role={selectedProfileRole}
          currentUserId={profile?.id || ""}
          chatId={chatId}
          onClose={() => setSelectedProfileRole(null)}
          onUpdated={loadPapeis}
          onDeleted={loadPapeis}
        />
      )}

      {/* Confirm Delete Note */}
      {confirmDeleteNote && (
        <ConfirmModal
          message="Você tem certeza de que quer deletar esta nota?"
          confirmText="Deletar"
          onConfirm={() => { handleDeleteNote(); setConfirmDeleteNote(false); }}
          onCancel={() => setConfirmDeleteNote(false)}
        />
      )}

      {/* Bastidores View */}
      {showBastidores && (
        <BastidoresView
          onBack={() => setShowBastidores(false)}
          onImported={() => { loadPapeis(); }}
        />
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Usuario, Chat } from '../types/database';
import { Search, MessageCircle, LogOut, Theater, Loader2 } from 'lucide-react';

interface ChatWithPartner extends Chat {
  partner: Usuario;
  last_message?: string;
  last_at?: string;
}

export default function HomeScreen({ onOpenChat }: { onOpenChat: (chatId: string, partner: Usuario) => void }) {
  const { profile, signOut } = useAuth();
  const [chats, setChats] = useState<ChatWithPartner[]>([]);
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState<Usuario | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadChats = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    const { data: chatRows } = await supabase
      .from('chats')
      .select('*')
      .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (!chatRows) {
      setLoading(false);
      return;
    }

    const enriched: ChatWithPartner[] = [];
    for (const chat of chatRows as Chat[]) {
      const partnerId = chat.user1_id === profile.id ? chat.user2_id : chat.user1_id;
      const { data: partner } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', partnerId)
        .maybeSingle();

      const { data: lastMsg } = await supabase
        .from('mensagens')
        .select('texto, created_at')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (partner) {
        enriched.push({
          ...chat,
          partner: partner as Usuario,
          last_message: lastMsg?.texto ?? '',
          last_at: lastMsg?.created_at ?? chat.created_at,
        });
      }
    }

    enriched.sort((a, b) => (b.last_at ?? '').localeCompare(a.last_at ?? ''));
    setChats(enriched);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  async function handleSearch() {
    if (!search.trim()) return;
    setSearching(true);
    setSearchResult(null);

    const cleanUsername = search.trim().toLowerCase().replace(/^@/, '');
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (data && data.id !== profile?.id) {
      setSearchResult(data as Usuario);
    } else {
      setSearchResult(null);
    }
    setSearching(false);
  }

  async function startChat(partner: Usuario) {
    if (!profile) return;
    const { data: chatId, error } = await supabase.rpc('find_or_create_chat1', {
      user1: profile.id,
      user2: partner.id,
    });

    if (chatId && !error) {
      onOpenChat(chatId as string, partner);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-navy-800">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-neon flex items-center justify-center">
            <Theater size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Encenação</h1>
            <p className="text-white/40 text-xs">@{profile?.username}</p>
          </div>
        </div>
        <button onClick={signOut} className="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center active:scale-90 transition">
          <LogOut size={18} className="text-white/60" />
        </button>
      </header>

      {/* Search */}
      <div className="px-5 mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Buscar por @username"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="input-pill w-full pl-11"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="btn-pill bg-neon text-white px-5"
          >
            {searching ? <Loader2 size={18} className="animate-spin" /> : 'Buscar'}
          </button>
        </div>

        {searchResult && (
          <div className="mt-3 bg-navy-700 rounded-3xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-navy-600 flex items-center justify-center text-lg font-bold">
                {searchResult.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{searchResult.display_name}</p>
                <p className="text-white/40 text-sm">@{searchResult.username}</p>
              </div>
            </div>
            <button
              onClick={() => startChat(searchResult)}
              className="btn-pill bg-neon text-white text-sm py-2.5"
            >
              Conversar
            </button>
          </div>
        )}

        {search && !searchResult && !searching && (
          <p className="text-white/30 text-sm text-center mt-3">Usuário não encontrado</p>
        )}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <h2 className="text-white/40 text-sm font-medium mb-3 px-1">Conversas</h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-neon" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageCircle size={48} className="text-white/20 mb-4" />
            <p className="text-white/40">Nenhuma conversa ainda</p>
            <p className="text-white/20 text-sm mt-1">Busque um amigo pelo @username</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onOpenChat(chat.id, chat.partner)}
                className="w-full bg-navy-700 rounded-3xl p-4 flex items-center gap-3 active:scale-[0.98] transition text-left"
              >
                <div className="w-12 h-12 rounded-full bg-navy-600 flex items-center justify-center text-lg font-bold shrink-0">
                  {chat.partner.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{chat.partner.display_name}</p>
                  <p className="text-white/40 text-sm truncate">
                    {chat.last_message || `@${chat.partner.username}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

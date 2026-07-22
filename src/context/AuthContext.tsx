import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Usuario } from '../types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Usuario | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  updateProfile: (data: { username?: string; display_name?: string; bio?: string; avatar_url?: string; profile_bg_url?: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data as Usuario | null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, username: string, displayName: string) {
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

    const { data: existing } = await supabase
      .from('usuarios')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) return { error: 'Este @username já está em uso' };

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };

    if (data.user) {
      await supabase.from('usuarios').upsert({
        id: data.user.id,
        username: cleanUsername,
        display_name: displayName,
      });
    }

    return { error: null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function updateProfile(data: { username?: string; display_name?: string; bio?: string; avatar_url?: string; profile_bg_url?: string }) {
    if (!session?.user) return { error: 'Não autenticado' };

    if (data.username) {
      const cleanUsername = data.username.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const { data: existing } = await supabase
        .from('usuarios')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', session.user.id)
        .maybeSingle();
      if (existing) return { error: 'Este @username já está em uso' };
      data.username = cleanUsername;
    }

    if (data.bio && data.bio.length > 200) {
      return { error: 'Bio deve ter no máximo 200 caracteres' };
    }

    const { error } = await supabase
      .from('usuarios')
      .update(data)
      .eq('id', session.user.id);
    if (error) return { error: error.message };

    await fetchProfile(session.user.id);
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function refreshProfile() {
    if (session?.user) await fetchProfile(session.user.id);
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signUp, signIn, signInWithGoogle, updateProfile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

"use client";

import React from 'react';
import { ArrowLeft, MessageCircle, Theater } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Usuario } from '../types/database';

interface UserProfileScreenProps {
  user: Usuario;
  onBack: () => void;
  onOpenChat: (chatId: string, partner: Usuario) => void;
  onOpenBastidores: (userId: string, userName: string) => void;
}

export default function UserProfileScreen({ user, onBack, onOpenChat, onOpenBastidores }: UserProfileScreenProps) {
  const { profile } = useAuth();

  const handleStartChat = async () => {
    if (!profile) return;
    const { data: chatId, error } = await supabase.rpc('find_or_create_chat', {
      user1: profile.id,
      user2: user.id,
    });
    if (error) {
      console.error('Erro ao criar chat:', error);
      return;
    }
    if (chatId) {
      onOpenChat(chatId as string, user);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-navy-700 shrink-0">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition"
        >
          <ArrowLeft size={20} className="text-white/70" />
        </button>
        <div className="flex-1 min-w-0" />
        <button
          onClick={handleStartChat}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-neon text-white text-sm font-medium active:scale-95 transition"
        >
          <MessageCircle size={16} />
          Conversar
        </button>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Header with Background */}
        <div className="relative">
          {/* Background */}
          <div
            className="absolute inset-0 h-48 bg-cover bg-center"
            style={{
              backgroundImage: user.profile_bg_url ? `url(${user.profile_bg_url})` : undefined,
              backgroundColor: '#1a1f36',
              opacity: 0.4,
            }}
          />

          {/* Profile Info */}
          <div className="relative pt-16 pb-6 px-6 flex flex-col items-center">
            {/* Avatar */}
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name}
                className="w-24 h-24 rounded-full object-cover border-4 border-navy-800 mb-4"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-navy-700 flex items-center justify-center text-3xl font-bold border-4 border-navy-800 mb-4">
                {user.display_name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}

            {/* Name and Username */}
            <h1 className="text-xl font-bold text-white">{user.display_name}</h1>
            <p className="text-white/50 text-sm">@{user.username}</p>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="px-6 py-4">
            <div className="bg-navy-800 rounded-2xl p-4 border border-white/5">
              <p className="text-white/70 text-sm leading-relaxed">{user.bio}</p>
            </div>
          </div>
        )}

        {/* Bastidores Button */}
        <div className="px-6 py-4">
          <button
            onClick={() => onOpenBastidores(user.id, user.display_name)}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-navy-800 border border-white/5 active:scale-[0.98] transition hover:bg-navy-750"
          >
            <Theater size={24} className="text-accent-400" />
            <span className="text-white font-medium">Ver Bastidores</span>
          </button>
        </div>
      </div>
    </div>
  );
}

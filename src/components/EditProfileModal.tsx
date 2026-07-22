"use client";

import React, { useState, useRef, useCallback } from 'react';
import { X, Camera, Loader2, Image } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import ImageCropperModal from './ImageCropperModal';

interface EditProfileModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

export default function EditProfileModal({ onClose, onSaved }: EditProfileModalProps) {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [profileBgUrl, setProfileBgUrl] = useState<string | null>(profile?.profile_bg_url ?? null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const compressImage = (file: File | Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.7);
        };
      };
    });
  };

  const uploadCroppedImage = useCallback(async (croppedBlob: Blob) => {
    if (!profile) return;
    setUploading(true);
    try {
      const optimizedBlob = await compressImage(croppedBlob);
      const path = `avatars/${profile.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('imagens')
        .upload(path, optimizedBlob, { cacheControl: '3600', upsert: true });

      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(path);
      setAvatarUrl(publicUrl);
    } catch (err: unknown) {
      console.error('Erro ao upload avatar:', err);
      setError((err as Error)?.message || 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
      setCropModalOpen(false);
      setImageToCrop(null);
    }
  }, [profile]);

  const handleBgFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    setUploadingBg(true);
    setError(null);
    try {
      const optimizedBlob = await compressImage(file);
      const path = `profiles/${profile.id}/bg_${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('imagens')
        .upload(path, optimizedBlob, { cacheControl: '3600', upsert: true });

      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(path);
      setProfileBgUrl(publicUrl);
    } catch (err: unknown) {
      console.error('Erro ao upload papel de parede:', err);
      setError((err as Error)?.message || 'Erro ao enviar imagem.');
    } finally {
      setUploadingBg(false);
    }
    e.target.value = '';
  }, [profile]);

  const handleRemoveBg = useCallback(() => {
    setProfileBgUrl(null);
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setError(null);

    if (!username.trim()) {
      setError('Nome de usuário é obrigatório');
      return;
    }

    if (!displayName.trim()) {
      setError('Nome de exibição é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const result = await updateProfile({
        username: username.trim(),
        display_name: displayName.trim(),
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl || undefined,
        profile_bg_url: profileBgUrl || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        await refreshProfile();
        onSaved?.();
        onClose();
      }
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      setError('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-navy-700 shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition"
        >
          <X size={20} className="text-white/70" />
        </button>
        <h1 className="text-base font-bold text-white">Editar Perfil</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-neon font-medium text-sm active:scale-95 transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Salvar'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-accent-500/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-navy-700 flex items-center justify-center text-3xl font-bold border-4 border-accent-500/30">
                {displayName?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center active:scale-90 transition disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <Camera size={16} className="text-white" />
              )}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-white/40 text-xs">Toque para trocar foto</p>
        </div>

        {/* Profile Wallpaper */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/70">Papel de Parede do Perfil</label>
          <div className="relative">
            {profileBgUrl ? (
              <div className="relative h-32 rounded-2xl overflow-hidden border border-white/10">
                <img
                  src={profileBgUrl}
                  alt="Papel de parede"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={handleRemoveBg}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center active:scale-90 transition"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => bgFileInputRef.current?.click()}
                disabled={uploadingBg}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition hover:border-white/30"
              >
                {uploadingBg ? (
                  <Loader2 size={24} className="animate-spin text-white/50" />
                ) : (
                  <Image size={24} className="text-white/30" />
                )}
                <span className="text-white/40 text-sm">
                  {uploadingBg ? 'Enviando...' : 'Adicionar papel de parede'}
                </span>
              </button>
            )}
          </div>
          <input
            ref={bgFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleBgFileSelect}
            className="hidden"
          />
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/70">Nome de Exibição</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
            className="input-pill w-full"
            placeholder="Seu nome"
          />
        </div>

        {/* Username */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/70">@username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            className="input-pill w-full"
            placeholder="seu_usuario"
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/70">
            Bio ({bio.length}/200)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            maxLength={200}
            rows={3}
            className="input-pill w-full resize-none"
            placeholder="Conte um pouco sobre você..."
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>

      {/* Image Cropper Modal */}
      {cropModalOpen && imageToCrop && (
        <ImageCropperModal
          image={imageToCrop}
          onCropComplete={uploadCroppedImage}
          onClose={() => {
            setCropModalOpen(false);
            setImageToCrop(null);
          }}
        />
      )}
    </div>
  );
}

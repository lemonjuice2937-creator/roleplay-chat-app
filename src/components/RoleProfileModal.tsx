"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, User, BookOpen, Shirt, Sparkles, Pencil, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { hexToHsv, hsvToHex, getColorName, isValidHex, GradientColorPicker } from './ColorPicker';

import ReferencesView from './ReferencesView';
import ClothingView from './ClothingView';
import SkillsView from './SkillsView';
import ImageCropperModal from './ImageCropperModal';
import ConfirmModal from './ConfirmModal';
import { autoBackupPapel } from '../services/personagensSalvosService';

interface RoleProfileModalProps {
  role: any;
  currentUserId: string;
  chatId?: string;
  onClose: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

export default function RoleProfileModal({ role, currentUserId, chatId, onClose, onUpdated, onDeleted }: RoleProfileModalProps) {
  const isOwner = role.user_id === currentUserId;
  const canEdit = isOwner || !!chatId;

  const [nome, setNome] = useState(role.nome ?? '');
  const [descricao, setDescricao] = useState(role.descricao ?? '');
  const [activeSubView, setActiveSubView] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(role.avatar_url ?? null);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [corBalao, setCorBalao] = useState(role.cor_balao ?? '#8A2BE2');
  const [corFonte, setCorFonte] = useState(role.cor_fonte ?? '#FFFFFF');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showBalaoPicker, setShowBalaoPicker] = useState(false);
  const [showFontePicker, setShowFontePicker] = useState(false);
  const [balaoHue, setBalaoHue] = useState(() => {
    const hsv = hexToHsv(role.cor_balao ?? '#8A2BE2');
    return hsv.h;
  });
  const [fonteHue, setFonteHue] = useState(() => {
    const hsv = hexToHsv(role.cor_fonte ?? '#FFFFFF');
    return hsv.h;
  });

  const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function uploadCroppedImage(croppedBlob: Blob) {
    setUploading(true);
    try {
      const optimizedBlob = await compressImage(croppedBlob);
      const path = `papeis/${role.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('imagens')
        .upload(path, optimizedBlob, { cacheControl: '3600', upsert: true });

      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('papeis')
        .update({ avatar_url: publicUrl })
        .eq('id', role.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      onUpdated?.();
      autoBackupPapel(role.id, currentUserId);
    } catch (err: any) {
      console.error('Erro ao upload avatar:', err);
      alert(err?.message || 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
      setCropModalOpen(false);
      setImageToCrop(null);
    }
  }

  const handleSave = async () => {
    if (!nome.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('papeis')
        .update({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          cor_balao: corBalao,
          cor_fonte: corFonte,
        })
        .eq('id', role.id);

      if (error) throw error;
      onUpdated?.();
      autoBackupPapel(role.id, currentUserId);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      alert(err?.message || 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const [confirmAction, setConfirmAction] = useState<'leave' | 'delete' | null>(null);
  const [equipped, setEquipped] = useState(role.equipado ?? false);

  const handleUnequip = async () => {
    try {
      const { error } = await supabase
        .from('papeis')
        .update({ equipado: false })
        .eq('id', role.id);
      if (error) throw error;
      setEquipped(false);
      onUpdated?.();
      autoBackupPapel(role.id, currentUserId);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Erro ao deixar papel.');
    }
  };

  const handleEquip = async () => {
    try {
      const { error } = await supabase
        .from('papeis')
        .update({ equipado: true })
        .eq('id', role.id);
      if (error) throw error;
      setEquipped(true);
      onUpdated?.();
      autoBackupPapel(role.id, currentUserId);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Erro ao equipar papel.');
    }
  };

  const handleDeleteRole = async () => {
    try {
      const { error } = await supabase
        .from('papeis')
        .delete()
        .eq('id', role.id);
      if (error) throw error;
      onDeleted?.();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir papel.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-navy-900 rounded-3xl border border-purple-500/30 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Perfil do Personagem</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-navy-800 hover:bg-navy-700 flex items-center justify-center active:scale-90 transition-colors"
          >
            <X size={20} className="text-white/60" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-8">
          {canEdit ? (
            <div
              className="relative w-24 h-24 rounded-full bg-navy-800 border-2 border-purple-500/30 flex items-center justify-center overflow-hidden mb-4 cursor-pointer group"
              onMouseEnter={() => setIsAvatarHovered(true)}
              onMouseLeave={() => setIsAvatarHovered(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={role.nome} className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-white/30" />
              )}
              {isAvatarHovered && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity">
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Pencil size={20} className="text-white" />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-navy-800 border-2 border-purple-500/30 flex items-center justify-center overflow-hidden mb-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt={role.nome} className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-white/30" />
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {canEdit ? (
            <div className="w-full">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={20}
                className="w-full text-center text-xl font-bold text-white bg-navy-800 border border-purple-500/20 rounded-xl px-4 py-2 mb-1 focus:outline-none focus:border-purple-500/50 transition-colors"
                placeholder="Nome do personagem"
              />
              <span className="text-[10px] text-white/30 block mb-2">{nome.length}/20</span>
            </div>
          ) : (
            <h3 className="text-xl font-bold text-white mb-2">{role.nome}</h3>
          )}

          {canEdit ? (
            <div className="w-full">
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={250}
                className="w-full text-center text-sm text-white/60 bg-navy-800 border border-purple-500/20 rounded-xl px-4 py-2 resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
                placeholder="Descrição (opcional)"
                rows={3}
              />
              <span className="text-[10px] text-white/30 block mt-1">{descricao.length}/250</span>
            </div>
          ) : (
            <p className="text-sm text-white/60 text-center">
              {role.descricao || 'Sem descrição'}
            </p>
          )}
        </div>

        {canEdit && (
          <>
            {/* Bubble Color Picker */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowBalaoPicker(!showBalaoPicker)}
                className="w-full flex justify-between items-center bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-white hover:border-white/20 transition"
              >
                <span className="text-sm font-medium">Cor do balão</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 font-mono">{corBalao.toUpperCase()}</span>
                  <div className="w-6 h-6 rounded-md border border-white/20 shadow-inner" style={{ backgroundColor: corBalao }} />
                  {showBalaoPicker ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                </div>
              </button>
              {showBalaoPicker && (
                <div className="mt-2 p-3 bg-navy-950/50 border border-white/5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md border border-white/20 shadow-inner shrink-0" style={{ backgroundColor: corBalao }} />
                    <span className="text-xs text-white/50">{getColorName(corBalao)}</span>
                  </div>
                  <GradientColorPicker
                    color={corBalao}
                    onChange={setCorBalao}
                    hue={balaoHue}
                    onHueChange={setBalaoHue}
                  />
                  <div>
                    <label className="text-white/50 text-xs mb-1 block">Hex</label>
                    <input
                      type="text"
                      value={corBalao}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (isValidHex(val)) {
                          setCorBalao(val.toUpperCase());
                          setBalaoHue(hexToHsv(val).h);
                        }
                        else if (val === '' || val === '#') setCorBalao(val);
                      }}
                      maxLength={7}
                      className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                      placeholder="#FF0000"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Font Color Picker */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowFontePicker(!showFontePicker)}
                className="w-full flex justify-between items-center bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-white hover:border-white/20 transition"
              >
                <span className="text-sm font-medium">Cor do texto</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 font-mono">{corFonte.toUpperCase()}</span>
                  <div className="w-6 h-6 rounded-md border border-white/20 shadow-inner" style={{ backgroundColor: corFonte }} />
                  {showFontePicker ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                </div>
              </button>
              {showFontePicker && (
                <div className="mt-2 p-3 bg-navy-950/50 border border-white/5 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md border border-white/20 shadow-inner shrink-0" style={{ backgroundColor: corFonte }} />
                    <span className="text-xs text-white/50">{getColorName(corFonte)}</span>
                  </div>
                  <GradientColorPicker
                    color={corFonte}
                    onChange={setCorFonte}
                    hue={fonteHue}
                    onHueChange={setFonteHue}
                  />
                  <div>
                    <label className="text-white/50 text-xs mb-1 block">Hex</label>
                    <input
                      type="text"
                      value={corFonte}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (isValidHex(val)) {
                          setCorFonte(val.toUpperCase());
                          setFonteHue(hexToHsv(val).h);
                        }
                        else if (val === '' || val === '#') setCorFonte(val);
                      }}
                      maxLength={7}
                      className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Message Preview */}
            <div className="mb-6">
              <label className="text-white/50 text-sm mb-2 block">Prévia da mensagem</label>
              <div className="rounded-2xl p-4 transition-all duration-200" style={{ backgroundColor: corBalao }}>
                <p className="text-sm font-semibold mb-1" style={{ color: corFonte }}>{nome || 'Nome do Personagem'}</p>
                <p className="text-sm leading-relaxed" style={{ color: corFonte }}>Sua mensagem de interpretação vai aparecer com esse visual aqui dentro do chat.</p>
              </div>
            </div>
          </>
        )}

        <div className="space-y-3 mb-6">
          <button
            onClick={() => setActiveSubView('referencias')}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all duration-200 rounded-2xl font-medium text-white flex items-center gap-3 px-6"
          >
            <BookOpen size={22} />
            Banco de Referências
          </button>

          <button
            onClick={() => setActiveSubView('vestuario')}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all duration-200 rounded-2xl font-medium text-white flex items-center gap-3 px-6"
          >
            <Shirt size={22} />
            Vestuário
          </button>

          <button
            onClick={() => setActiveSubView('skills')}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all duration-200 rounded-2xl font-medium text-white flex items-center gap-3 px-6"
          >
            <Sparkles size={22} />
            Banco de Skills
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={!nome.trim() || saving}
              className="w-full py-4 bg-navy-800 hover:bg-navy-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-2xl font-medium text-white border border-purple-500/20"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          )}

          {canEdit && !equipped && (
            <button
              onClick={handleEquip}
              className="w-full py-4 bg-neon/20 hover:bg-neon/30 active:scale-95 transition-all duration-200 rounded-2xl font-medium text-neon border border-neon/30"
            >
              Equipar papel
            </button>
          )}

          {canEdit && equipped && (
            <button
              onClick={() => setConfirmAction('leave')}
              className="w-full py-4 bg-navy-800 hover:bg-navy-700 active:scale-95 transition-all duration-200 rounded-2xl font-medium text-white border border-purple-500/20"
            >
              Deixar papel
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => setConfirmAction('delete')}
              className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all duration-200 rounded-2xl font-medium text-red-400 border border-red-500/20"
            >
              Excluir papel
            </button>
          )}
        </div>

        {activeSubView === 'referencias' && (
          <ReferencesView
            roleId={role.id}
            userId={role.user_id}
            canEdit={canEdit}
            onBack={() => setActiveSubView(null)}
          />
        )}

        {activeSubView === 'vestuario' && (
          <ClothingView
            roleId={role.id}
            userId={role.user_id}
            canEdit={canEdit}
            onBack={() => setActiveSubView(null)}
          />
        )}

        {activeSubView === 'skills' && (
          <SkillsView
            roleId={role.id}
            userId={role.user_id}
            canEdit={canEdit}
            onBack={() => setActiveSubView(null)}
          />
        )}
      </div>

      {cropModalOpen && imageToCrop && (
        <ImageCropperModal
          image={imageToCrop}
          onCropComplete={(blob) => { if (blob) uploadCroppedImage(blob); }}
          onClose={() => { setCropModalOpen(false); setImageToCrop(null); }}
        />
      )}

      {confirmAction === 'leave' && (
        <ConfirmModal
          message={`Você tem certeza de que quer deixar ${role.nome}?`}
          confirmText="Deixar"
          onConfirm={() => { handleUnequip(); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === 'delete' && (
        <ConfirmModal
          message={`Você tem certeza de que quer excluir ${role.nome}? Essa ação não pode ser desfeita.`}
          onConfirm={() => { handleDeleteRole(); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, User, BookOpen, Shirt, Sparkles, Pencil, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReferencesView from './ReferencesView';
import ClothingView from './ClothingView';
import SkillsView from './SkillsView';
import ImageCropperModal from './ImageCropperModal';

function hsvToHex(h: number, s: number, v: number): string {
  s /= 100;
  v /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => v * (1 - s * Math.max(0, Math.min(k(n) - 3, 9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  if (!hex || hex.length < 7) return { h: 0, s: 0, v: 100 };
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h = 0;
  if (diff !== 0) {
    if (max === r) h = ((g - b) / diff) * 60;
    if (max === g) h = ((b - r) / diff) * 60 + 120;
    if (max === b) h = ((r - g) / diff) * 60 + 240;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (diff / max) * 100;
  const v = max * 100;
  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
}

interface RoleProfileModalProps {
  role: any;
  currentUserId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function RoleProfileModal({ role, currentUserId, onClose, onUpdated }: RoleProfileModalProps) {
  const isOwner = role.user_id === currentUserId;

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

  const [corBalaoHsv, setCorBalaoHsv] = useState(() => hexToHsv(role.cor_balao ?? '#8A2BE2'));
  const [corFonteHsv, setCorFonteHsv] = useState(() => hexToHsv(role.cor_fonte ?? '#FFFFFF'));

  const corBalaoCanvasRef = useRef<HTMLCanvasElement>(null);
  const corFonteCanvasRef = useRef<HTMLCanvasElement>(null);
  const mouseDownRef = useRef(false);
  const activePickerRef = useRef<'balao' | 'fonte' | null>(null);

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
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      alert(err?.message || 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const renderColorPicker = (hsv: { h: number; s: number; v: number }, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = hsvToHex(hsv.h, 100, 100);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const satGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    satGrad.addColorStop(0, '#fff');
    satGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = satGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const valGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    valGrad.addColorStop(0, 'rgba(0,0,0,0)');
    valGrad.addColorStop(1, '#000');
    ctx.fillStyle = valGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const x = (hsv.s / 100) * canvas.width;
    const y = ((100 - hsv.v) / 100) * canvas.height;
    ctx.strokeStyle = hsv.v > 50 ? '#000' : '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.stroke();
  };

  useEffect(() => {
    if (showBalaoPicker && corBalaoCanvasRef.current) {
      renderColorPicker(corBalaoHsv, corBalaoCanvasRef.current);
    }
  }, [showBalaoPicker, corBalaoHsv]);

  useEffect(() => {
    if (showFontePicker && corFonteCanvasRef.current) {
      renderColorPicker(corFonteHsv, corFonteCanvasRef.current);
    }
  }, [showFontePicker, corFonteHsv]);

  const handleColorAction = (clientX: number, clientY: number, picker: 'balao' | 'fonte') => {
    const canvas = picker === 'balao' ? corBalaoCanvasRef.current : corFonteCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    const s = Math.round((x / rect.width) * 100);
    const v = Math.round(100 - (y / rect.height) * 100);
    if (picker === 'balao') {
      const updated = { ...corBalaoHsv, s, v };
      setCorBalaoHsv(updated);
      setCorBalao(hsvToHex(updated.h, s, v));
    } else {
      const updated = { ...corFonteHsv, s, v };
      setCorFonteHsv(updated);
      setCorFonte(hsvToHex(updated.h, s, v));
    }
  };

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (!mouseDownRef.current || !activePickerRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      handleColorAction(clientX, clientY, activePickerRef.current);
    };
    const handleGlobalUp = () => {
      mouseDownRef.current = false;
      activePickerRef.current = null;
    };
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchmove', handleGlobalMove);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [corBalaoHsv, corFonteHsv, activePickerRef.current]);

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
          {isOwner ? (
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

          {isOwner ? (
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full text-center text-xl font-bold text-white bg-navy-800 border border-purple-500/20 rounded-xl px-4 py-2 mb-2 focus:outline-none focus:border-purple-500/50 transition-colors"
              placeholder="Nome do personagem"
            />
          ) : (
            <h3 className="text-xl font-bold text-white mb-2">{role.nome}</h3>
          )}

          {isOwner ? (
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full text-center text-sm text-white/60 bg-navy-800 border border-purple-500/20 rounded-xl px-4 py-2 resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
              placeholder="Descrição (opcional)"
              rows={3}
            />
          ) : (
            <p className="text-sm text-white/60 text-center">
              {role.descricao || 'Sem descrição'}
            </p>
          )}
        </div>

        {isOwner && (
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
                  <div
                    className="relative h-28 rounded-lg overflow-hidden cursor-crosshair"
                    onMouseDown={(e) => { mouseDownRef.current = true; activePickerRef.current = 'balao'; handleColorAction(e.clientX, e.clientY, 'balao'); }}
                    onTouchStart={(e) => { mouseDownRef.current = true; activePickerRef.current = 'balao'; handleColorAction(e.touches[0].clientX, e.touches[0].clientY, 'balao'); }}
                  >
                    <canvas ref={corBalaoCanvasRef} className="w-full h-full" width={300} height={112} />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={corBalaoHsv.h}
                    onChange={(e) => {
                      const h = Number(e.target.value);
                      const updated = { ...corBalaoHsv, h };
                      setCorBalaoHsv(updated);
                      setCorBalao(hsvToHex(h, updated.s, updated.v));
                    }}
                    className="w-full h-2 bg-navy-800 rounded-lg appearance-none cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
                  />
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
                  <div
                    className="relative h-28 rounded-lg overflow-hidden cursor-crosshair"
                    onMouseDown={(e) => { mouseDownRef.current = true; activePickerRef.current = 'fonte'; handleColorAction(e.clientX, e.clientY, 'fonte'); }}
                    onTouchStart={(e) => { mouseDownRef.current = true; activePickerRef.current = 'fonte'; handleColorAction(e.touches[0].clientX, e.touches[0].clientY, 'fonte'); }}
                  >
                    <canvas ref={corFonteCanvasRef} className="w-full h-full" width={300} height={112} />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={corFonteHsv.h}
                    onChange={(e) => {
                      const h = Number(e.target.value);
                      const updated = { ...corFonteHsv, h };
                      setCorFonteHsv(updated);
                      setCorFonte(hsvToHex(h, updated.s, updated.v));
                    }}
                    className="w-full h-2 bg-navy-800 rounded-lg appearance-none cursor-pointer"
                    style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
                  />
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

        {isOwner && (
          <button
            onClick={handleSave}
            disabled={!nome.trim() || saving}
            className="w-full py-4 bg-navy-800 hover:bg-navy-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-2xl font-medium text-white border border-purple-500/20"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        )}

        {activeSubView === 'referencias' && (
          <ReferencesView
            roleId={role.id}
            userId={role.user_id}
            isOwner={isOwner}
            onBack={() => setActiveSubView(null)}
          />
        )}

        {activeSubView === 'vestuario' && (
          <ClothingView
            roleId={role.id}
            userId={role.user_id}
            isOwner={isOwner}
            onBack={() => setActiveSubView(null)}
          />
        )}

        {activeSubView === 'skills' && (
          <SkillsView
            roleId={role.id}
            userId={role.user_id}
            isOwner={isOwner}
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
    </div>
  );
}

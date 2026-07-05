import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Papel } from '../types/database';
import { X, Loader2, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import ImageCropperModal from '../components/ImageCropperModal';

interface Props {
  papeis: Papel[];
  onClose: () => void;
  onRefresh?: () => void;
}

// HSV to Hex conversion helper
function hsvToHex(h: number, s: number, v: number): string {
  s /= 100;
  v /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => v * (1 - s * Math.max(0, Math.min(k(n) - 3, 9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}

// Hex to HSV conversion helper
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

export default function RoleplayCatalog({ papeis, onClose, onRefresh }: Props) {
  const { profile } = useAuth();
  const [nome, setNome] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [corBalao, setCorBalao] = useState('#8A2BE2');
  const [corFonte, setCorFonte] = useState('#FFFFFF');
  const [uploading, setUploading] = useState(false);
  const [criando, setCriando] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // Accordion toggle states for color tabs
  const [showBalaoPicker, setShowBalaoPicker] = useState(false);
  const [showFontePicker, setShowFontePicker] = useState(false);

  // HSV states for 2D color pickers
  const [corBalaoHsv, setCorBalaoHsv] = useState({ h: 270, s: 100, v: 88 });
  const [corFonteHsv, setCorFonteHsv] = useState({ h: 0, s: 0, v: 100 });

  const fileRef = useRef<HTMLInputElement>(null);
  const corBalaoCanvasRef = useRef<HTMLCanvasElement>(null);
  const corFonteCanvasRef = useRef<HTMLCanvasElement>(null);
  const mouseDownRef = useRef(false);
  const activePickerRef = useRef<'balao' | 'fonte' | null>(null);

  // Image compressor tool
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
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
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
  }

  async function uploadCroppedImage(croppedBlob: Blob) {
    if (!profile) return;
    setUploading(true);
    try {
      const optimizedBlob = await compressImage(croppedBlob);
      const path = `papeis/${profile.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('imagens')
        .upload(path, optimizedBlob, { cacheControl: '3600', upsert: true });

      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(path);
        setAvatarUrl(publicUrl);
      } else {
        alert(`Erro de Upload: ${upErr.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      setCropModalOpen(false);
      setImageToCrop(null);
    }
  }

  // Database Save Handler
  async function handleCriarPapel() {
    if (!profile || !nome) return;
    setCriando(true);
    try {
      const { error } = await supabase
        .from('papeis')
        .insert([
          {
            user_id: profile.id,
            nome: nome,
            avatar_url: avatarUrl,
            cor_balao: corBalao,
            cor_fonte: corFonte
          }
        ]);

      if (error) throw error;
      
      onRefresh?.();
      onClose();
    } catch (err: any) {
      alert(`Erro ao salvar papel: ${err.message}`);
    } finally {
      setCriando(false);
    }
  }

  // 2D Canvas Color picker renderer
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

  // Trigger canvas draw when tabs are opened or states modify
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-navy-900 border border-white/10 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition">
          <X size={24} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Catálogo de Papéis</h2>

        <div className="space-y-5">
          {/* Avatar Area */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-full bg-navy-600 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden active:scale-95 transition relative"
            >
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-purple-500" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Upload size={24} className="text-white/40" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            <p className="text-white/40 text-xs">Foto do personagem</p>
          </div>

          {/* Name Field */}
          <div>
            <label className="text-white/50 text-sm mb-1.5 block">Nome do personagem</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition"
              placeholder="Ex: Salvatore"
            />
          </div>

          {/* Bubble Color Picker Accordion */}
          <div>
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

          {/* Font Color Picker Accordion */}
          <div>
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

          {/* Message Box Preview */}
          <div>
            <label className="text-white/50 text-sm mb-2 block">Prévia da mensagem</label>
            <div className="rounded-2xl p-4 transition-all duration-200" style={{ backgroundColor: corBalao }}>
              <p className="text-sm font-semibold mb-1" style={{ color: corFonte }}>{nome || 'Nome do Personagem'}</p>
              <p className="text-sm leading-relaxed" style={{ color: corFonte }}>Sua mensagem de interpretação vai aparecer com esse visual aqui dentro do chat.</p>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleCriarPapel}
            disabled={!nome || uploading || criando}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-2xl shadow-lg transition duration-200 flex items-center justify-center gap-2"
          >
            {(uploading || criando) && <Loader2 size={20} className="animate-spin" />}
            Criar papel
          </button>
        </div>
      </div>

      {/* Circle Crop Modal Anchor */}
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
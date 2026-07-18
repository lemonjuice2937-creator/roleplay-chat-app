import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

interface ColorPickerProps {
  hexColor: string;
  onChange: (newHex: string) => void;
  label: string;
}

export default function ColorPicker({ hexColor, onChange, label }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const init = useRef(hexToHsv(hexColor));
  const [h, setH] = useState(init.current.h);
  const [s, setS] = useState(init.current.s);
  const [v, setV] = useState(init.current.v);

  const hueCanvasRef = useRef<HTMLCanvasElement>(null);
  const svCanvasRef = useRef<HTMLCanvasElement>(null);
  const mouseDownRef = useRef(false);
  const activeCanvasRef = useRef<'hue' | 'sv' | null>(null);
  const isInteracting = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const handleHueRef = useRef<(clientX: number) => void>(() => {});
  const handleSvRef = useRef<(clientX: number, clientY: number) => void>(() => {});

  useEffect(() => {
    if (isInteracting.current) return;
    const hsv = hexToHsv(hexColor);
    setH(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
  }, [hexColor]);

  useEffect(() => {
    if (!showPicker) return;
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const ht = canvas.height;

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#ff0000');
    grad.addColorStop(1 / 6, '#ffff00');
    grad.addColorStop(2 / 6, '#00ff00');
    grad.addColorStop(3 / 6, '#00ffff');
    grad.addColorStop(4 / 6, '#0000ff');
    grad.addColorStop(5 / 6, '#ff00ff');
    grad.addColorStop(1, '#ff0000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, ht);

    const x = (h / 360) * w;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ht);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [showPicker, h]);

  useEffect(() => {
    if (!showPicker) return;
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const ht = canvas.height;

    ctx.fillStyle = hsvToHex(h, 100, 100);
    ctx.fillRect(0, 0, w, ht);

    const satGrad = ctx.createLinearGradient(0, 0, w, 0);
    satGrad.addColorStop(0, '#fff');
    satGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = satGrad;
    ctx.fillRect(0, 0, w, ht);

    const valGrad = ctx.createLinearGradient(0, 0, 0, ht);
    valGrad.addColorStop(0, 'rgba(0,0,0,0)');
    valGrad.addColorStop(1, '#000');
    ctx.fillStyle = valGrad;
    ctx.fillRect(0, 0, w, ht);

    const cx = (s / 100) * w;
    const cy = ((100 - v) / 100) * ht;
    ctx.strokeStyle = v > 50 ? '#000' : '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.stroke();
  }, [showPicker, h, s, v]);

  const handleHueInteraction = useCallback((clientX: number) => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newH = Math.round((x / rect.width) * 360);
    setH(newH);
    onChangeRef.current(hsvToHex(newH, s, v));
  }, [s, v]);

  const handleSvInteraction = useCallback((clientX: number, clientY: number) => {
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    const newS = Math.round((x / rect.width) * 100);
    const newV = Math.round(100 - (y / rect.height) * 100);
    setS(newS);
    setV(newV);
    onChangeRef.current(hsvToHex(h, newS, newV));
  }, [h]);

  useEffect(() => { handleHueRef.current = handleHueInteraction; }, [handleHueInteraction]);
  useEffect(() => { handleSvRef.current = handleSvInteraction; }, [handleSvInteraction]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!mouseDownRef.current || !activeCanvasRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      if (activeCanvasRef.current === 'hue') handleHueRef.current(clientX);
      else handleSvRef.current(clientX, clientY);
    };
    const handleUp = () => {
      mouseDownRef.current = false;
      activeCanvasRef.current = null;
      isInteracting.current = false;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  const hex = hsvToHex(h, s, v);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-full flex justify-between items-center bg-navy-800 border border-white/10 rounded-xl px-4 py-3 text-white hover:border-white/20 transition"
      >
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 font-mono">{hex.toUpperCase()}</span>
          <div className="w-6 h-6 rounded-md border border-white/20 shadow-inner" style={{ backgroundColor: hex }} />
          {showPicker ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
        </div>
      </button>
      {showPicker && (
        <div className="mt-2 p-3 bg-navy-950/50 border border-white/5 rounded-xl space-y-3">
          <div
            className="relative h-40 rounded-lg overflow-hidden cursor-crosshair"
            onMouseDown={(e) => {
              mouseDownRef.current = true;
              activeCanvasRef.current = 'sv';
              isInteracting.current = true;
              handleSvInteraction(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              mouseDownRef.current = true;
              activeCanvasRef.current = 'sv';
              isInteracting.current = true;
              handleSvInteraction(e.touches[0].clientX, e.touches[0].clientY);
            }}
          >
            <canvas ref={svCanvasRef} className="w-full h-full" width={300} height={160} />
          </div>
          <div
            className="relative h-6 rounded-lg overflow-hidden cursor-crosshair"
            onMouseDown={(e) => {
              mouseDownRef.current = true;
              activeCanvasRef.current = 'hue';
              isInteracting.current = true;
              handleHueInteraction(e.clientX);
            }}
            onTouchStart={(e) => {
              mouseDownRef.current = true;
              activeCanvasRef.current = 'hue';
              isInteracting.current = true;
              handleHueInteraction(e.touches[0].clientX);
            }}
          >
            <canvas ref={hueCanvasRef} className="w-full h-full" width={300} height={24} />
          </div>
        </div>
      )}
    </div>
  );
}

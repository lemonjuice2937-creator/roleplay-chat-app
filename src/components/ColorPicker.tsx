import { useRef, useEffect, useCallback } from 'react';

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
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

export function hsvToHex(h: number, s: number, v: number): string {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getColorName(hex: string): string {
  const hsv = hexToHsv(hex);
  const { h, s, v } = hsv;
  if (v < 10) return 'Preto';
  if (s < 10 && v > 90) return 'Branco';
  if (s < 10) return 'Cinza';
  const names: [number, string][] = [
    [0, 'Vermelho'], [15, 'Vermelho-alaranjado'], [30, 'Laranja'],
    [45, 'Amarelo-alaranjado'], [60, 'Amarelo'], [75, 'Amarelo-esverdeado'],
    [90, 'Verde-amarelo'], [120, 'Verde'], [150, 'Verde-azulado'],
    [180, 'Ciano'], [210, 'Azul-piscina'], [240, 'Azul'],
    [270, 'Azul-violeta'], [300, 'Violeta'], [330, 'Vermelho-rosa'],
    [360, 'Vermelho'],
  ];
  let name = 'Vermelho';
  for (const [hue, n] of names) {
    if (h <= hue) { name = n; break; }
  }
  if (v < 50) name += ' escuro';
  else if (v > 80 && s < 60) name += ' claro';
  return name;
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export function GradientColorPicker({
  color,
  onChange,
  hue,
  onHueChange,
}: {
  color: string;
  onChange: (hex: string) => void;
  hue: number;
  onHueChange: (h: number) => void;
}) {
  const hsv = hexToHsv(color);
  const squareRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'square' | 'hue' | null>(null);

  const handleSquareInteraction = useCallback((clientX: number, clientY: number) => {
    const el = squareRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    const s = Math.round((x / rect.width) * 100);
    const v = Math.round(100 - (y / rect.height) * 100);
    onChange(hsvToHex(hue, s, v));
  }, [hue, onChange]);

  const handleHueInteraction = useCallback((clientY: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    const h = Math.round((y / rect.height) * 360);
    onHueChange(h);
    onChange(hsvToHex(h, hsv.s, hsv.v));
  }, [hsv.s, hsv.v, onHueChange, onChange]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      if (dragging.current === 'square') handleSquareInteraction(clientX, clientY);
      else if (dragging.current === 'hue') handleHueInteraction(clientY);
    };
    const handleUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [handleSquareInteraction, handleHueInteraction]);

  const satX = (hsv.s / 100) * 100;
  const valY = ((100 - hsv.v) / 100) * 100;
  const hueY = (hue / 360) * 100;

  return (
    <div className="flex gap-3 items-stretch" style={{ height: 180 }}>
      <div
        ref={squareRef}
        className="relative flex-1 rounded-xl overflow-hidden cursor-crosshair"
        style={{ background: `linear-gradient(to top, #fff, ${hsvToHex(hue, 100, 100)})` }}
        onMouseDown={(e) => { dragging.current = 'square'; handleSquareInteraction(e.clientX, e.clientY); }}
        onTouchStart={(e) => { dragging.current = 'square'; handleSquareInteraction(e.touches[0].clientX, e.touches[0].clientY); }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, #000)' }} />
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${satX}%`,
            top: `${valY}%`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)',
          }}
        />
      </div>
      <div className="flex flex-col gap-2 items-center" style={{ width: 32 }}>
        <div
          ref={hueRef}
          className="relative flex-1 w-full rounded-xl overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
          }}
          onMouseDown={(e) => { dragging.current = 'hue'; handleHueInteraction(e.clientY); }}
          onTouchStart={(e) => { dragging.current = 'hue'; handleHueInteraction(e.touches[0].clientY); }}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white pointer-events-none"
            style={{
              top: `${hueY}%`,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

import type { Papel } from '../types/database';
import { sanitizeHexColor } from '../lib/sanitize';

interface Props {
  papel: Papel;
  size?: 'sm' | 'md' | 'lg';
  showBorder?: boolean;
  borderSize?: 'sm' | 'lg';
  borderColor?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-9 h-9 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-24 h-24 text-3xl',
};

export default function PapelAvatar({
  papel,
  size = 'md',
  showBorder = false,
  borderSize = 'sm',
  borderColor,
  className = '',
}: Props) {
  const safeBg = sanitizeHexColor(papel.cor_balao, '#8A2BE2');
  const safeFg = sanitizeHexColor(papel.cor_fonte, '#FFFFFF');
  const resolvedBorderColor = borderColor ?? safeBg;
  const borderClasses = showBorder ? (borderSize === 'lg' ? 'border-4' : 'border-2') : '';

  if (papel.avatar_url) {
    return (
      <img
        src={papel.avatar_url}
        alt={papel.nome}
        className={`rounded-full object-cover shrink-0 ${sizeClasses[size]} ${borderClasses} ${className}`}
        style={showBorder ? { borderColor: resolvedBorderColor } : undefined}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${sizeClasses[size]} ${borderClasses} ${className}`}
      style={{
        backgroundColor: safeBg,
        color: safeFg,
        ...(showBorder ? { borderColor: resolvedBorderColor } : {}),
      }}
    >
      {papel.nome.charAt(0).toUpperCase()}
    </div>
  );
}

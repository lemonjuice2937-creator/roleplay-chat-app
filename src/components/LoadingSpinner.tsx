import { Loader2 } from 'lucide-react';

interface Props {
  size?: number;
  className?: string;
}

export default function LoadingSpinner({ size = 24, className = 'text-neon' }: Props) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

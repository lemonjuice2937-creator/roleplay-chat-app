import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <div className="mb-4">{icon}</div>}
      <p className="text-white/30">{title}</p>
      {subtitle && <p className="text-white/20 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

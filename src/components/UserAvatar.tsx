interface Props {
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-9 h-9 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
};

export default function UserAvatar({ displayName, size = 'md', className = '' }: Props) {
  return (
    <div
      className={`rounded-full bg-navy-600 flex items-center justify-center font-bold shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}

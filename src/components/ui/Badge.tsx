import type { ReactNode } from 'react';

type BadgeVariant = 'red' | 'blue' | 'green' | 'amber' | 'slate' | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  red: 'bg-red-900/50 text-red-300 border-red-700',
  blue: 'bg-blue-900/50 text-blue-300 border-blue-700',
  green: 'bg-green-900/50 text-green-300 border-green-700',
  amber: 'bg-amber-900/50 text-amber-300 border-amber-700',
  slate: 'bg-slate-700/50 text-slate-300 border-slate-600',
  purple: 'bg-purple-900/50 text-purple-300 border-purple-700',
};

export function Badge({ variant = 'slate', children, pulse = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        ${variantStyles[variant]}
        ${pulse ? 'animate-pulse' : ''}
        inline-flex items-center gap-1
        px-3 py-1 rounded-full
        text-sm font-medium
        border
        ${className}
      `}
    >
      {children}
    </span>
  );
}

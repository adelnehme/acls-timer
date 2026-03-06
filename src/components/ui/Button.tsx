import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'danger' | 'success' | 'warning' | 'ghost' | 'shockable' | 'nonshockable';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  pulse?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-slate-600 hover:bg-slate-500 text-white border-slate-500',
  danger: 'bg-red-600 hover:bg-red-500 text-white border-red-500',
  success: 'bg-green-600 hover:bg-green-500 text-white border-green-500',
  warning: 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500',
  ghost: 'bg-transparent hover:bg-slate-700 text-slate-300 border-slate-600',
  shockable: 'bg-red-700 hover:bg-red-600 text-white border-red-500',
  nonshockable: 'bg-blue-700 hover:bg-blue-600 text-white border-blue-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm min-h-[40px]',
  md: 'px-4 py-3 text-base min-h-[48px]',
  lg: 'px-6 py-4 text-lg min-h-[56px] font-semibold',
  xl: 'px-8 py-5 text-xl min-h-[64px] font-bold',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  pulse = false,
  fullWidth = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${pulse ? 'animate-pulse' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
        inline-flex items-center justify-center gap-2
        rounded-xl border-2 font-medium
        transition-all duration-150 ease-out
        select-none touch-manipulation
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

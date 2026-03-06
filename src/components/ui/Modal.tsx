import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
  closable?: boolean;
}

export function Modal({ open, onClose, children, title, className = '', closable = true }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closable ? onClose : undefined}
      />

      {/* Modal content */}
      <div
        className={`
          relative z-10 w-full max-w-lg
          bg-slate-800 border-2 border-slate-600
          rounded-2xl shadow-2xl
          p-6
          animate-in fade-in zoom-in-95
          ${className}
        `}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-50">{title}</h2>
            {closable && onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg touch-manipulation"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

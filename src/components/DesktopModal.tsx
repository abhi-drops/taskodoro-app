import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesktopModalProps {
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
  maxHeight?: string;
}

export function DesktopModal({
  onClose,
  title,
  icon,
  children,
  width = 'w-[640px]',
  maxHeight = 'max-h-[85vh]',
}: DesktopModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 m3-fade-in"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed z-50 flex flex-col',
          'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'rounded-3xl shadow-2xl border border-white/8',
          'm3-center-sheet',
          width,
          maxHeight,
        )}
        style={{ background: 'oklch(0.1 0.008 30)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0">
          {icon && (
            <div className="w-9 h-9 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <h2 className="font-bold text-base text-white flex-1 truncate">{title}</h2>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 flex items-center justify-center btn-spring-icon bg-white/8 text-white/50 hover:text-white hover:bg-white/15"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </>
  );
}

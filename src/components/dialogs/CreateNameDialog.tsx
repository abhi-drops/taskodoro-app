import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
  title: string;
  placeholder: string;
}

export function CreateNameDialog({ open, onOpenChange, onConfirm, title, placeholder }: Props) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setName('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setName('');
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-dialog-title"
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm rounded-3xl border border-white/10 shadow-2xl p-6"
        style={{ background: 'oklch(0.12 0.01 30)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 id="create-dialog-title" className="font-black text-lg text-white">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center w-8 h-8 rounded-2xl bg-white/8 text-white/40 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={placeholder}
            className="w-full h-12 rounded-2xl bg-white/8 border border-white/10 text-white text-sm px-4 placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/12 transition-all"
          />
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-2xl bg-white/8 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/15 hover:text-white transition-colors active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 h-11 rounded-2xl bg-primary text-white text-sm font-bold disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-primary/30"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

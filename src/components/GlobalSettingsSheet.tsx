import { Settings, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { DesktopModal } from '@/components/DesktopModal';

interface Props {
  onClose: () => void;
  isMobile: boolean;
}

export function GlobalSettingsSheet({ onClose, isMobile }: Props) {
  const { state, dispatch } = useAppStore();
  const truncate = state.settings?.truncateTaskText !== false;

  function handleTruncateToggle() {
    dispatch({ type: 'UPDATE_APP_SETTINGS', payload: { truncateTaskText: !truncate } });
  }

  const settingsContent = (
    <div className="space-y-2">
      <label className="text-xs font-bold text-white/30 uppercase tracking-widest">
        Task text
      </label>
      <button
        onClick={handleTruncateToggle}
        className="w-full flex items-center gap-3 rounded-2xl bg-white/6 border border-white/8 px-4 py-3.5 hover:bg-white/10 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Truncate long text</p>
          <p className="text-xs text-white/40 mt-0.5">Clip task names to one line</p>
        </div>
        <div
          className={[
            'relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200',
            truncate ? 'bg-primary' : 'bg-white/20',
          ].join(' ')}
          aria-checked={truncate}
          role="switch"
        >
          <div
            className={[
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
              truncate ? 'translate-x-5' : 'translate-x-0.5',
            ].join(' ')}
          />
        </div>
      </button>
    </div>
  );

  if (!isMobile) {
    return (
      <DesktopModal
        onClose={onClose}
        title="Settings"
        icon={<Settings size={15} className="text-white/50" />}
      >
        <div className="px-4 py-5 space-y-5 overflow-y-auto no-scrollbar">
          {settingsContent}
        </div>
      </DesktopModal>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 m3-fade-in"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-settings-title"
        className="m3-sheet fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 shadow-2xl"
        style={{
          background: 'oklch(0.1 0.008 30)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
          <div className="w-8 h-8 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
            <Settings size={15} className="text-white/50" />
          </div>
          <h2 id="global-settings-title" className="font-bold text-base text-white flex-1">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-2xl bg-white/8 text-white/40 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-5 space-y-5 max-h-[70dvh] overflow-y-auto no-scrollbar">
          {settingsContent}
        </div>
      </div>
    </>
  );
}

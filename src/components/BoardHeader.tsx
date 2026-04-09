import { PanelLeft, Plus, Timer, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  workspaceName: string;
  onNewGroup: () => void;
  onToggleSidebar: () => void;
  onOpenPomodoro: () => void;
  onOpenSearch: () => void;
}

export function BoardHeader({ workspaceName, onNewGroup, onToggleSidebar, onOpenPomodoro, onOpenSearch }: Props) {
  return (
    <header
      className="flex items-center gap-3 px-4 h-14 shrink-0 border-b border-white/8"
      style={{ background: 'oklch(0.09 0.008 30)' }}
    >
      <button
        className={cn(
          'md:hidden flex items-center justify-center w-10 h-10 rounded-2xl',
          'bg-white/8 text-white/50 hover:text-white hover:bg-white/15 transition-colors',
        )}
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <PanelLeft size={17} />
      </button>

      <h1 className="flex-1 font-bold text-base text-white truncate">{workspaceName}</h1>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenSearch}
          aria-label="Search tasks"
          className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/8 text-white/50 hover:text-white hover:bg-white/15 transition-colors"
        >
          <Search size={17} />
        </button>
        <button
          onClick={onOpenPomodoro}
          aria-label="Pomodoro timer"
          className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/8 text-white/50 hover:text-white hover:bg-white/15 transition-colors"
        >
          <Timer size={17} />
        </button>
        <button
          onClick={onNewGroup}
          className="flex items-center gap-1.5 h-9 px-4 rounded-2xl bg-primary text-white text-sm font-bold active:scale-95 transition-all shadow-lg shadow-primary/30 ml-1"
        >
          <Plus size={15} />
          New Group
        </button>
      </div>
    </header>
  );
}

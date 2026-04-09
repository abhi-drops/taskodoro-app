import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/types/index';

interface Props {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onNewWorkspace: () => void;
  onClose: () => void;
}

export function WorkspaceSheet({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onDeleteWorkspace,
  onNewWorkspace,
  onClose,
}: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t border-white/10"
        style={{
          background: 'oklch(0.1 0.008 30)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 px-5 pb-3">
          <h2 className="font-bold text-lg text-white flex-1">Workspaces</h2>
          <span className="text-xs text-white/30 font-medium">{workspaces.length}</span>
        </div>

        {/* Workspace list */}
        <div className="overflow-y-auto max-h-[50dvh] px-3 pb-2">
          {workspaces.length === 0 && (
            <p className="text-sm text-white/30 text-center py-8">No workspaces yet</p>
          )}
          {workspaces.map(ws => {
            const { total, done } = ws.groups.reduce(
              (acc, g) => ({
                total: acc.total + g.todos.length,
                done: acc.done + g.todos.filter(t => t.completed).length,
              }),
              { total: 0, done: 0 },
            );
            const isActive = ws.id === activeWorkspaceId;
            const pct = total > 0 ? (done / total) * 100 : 0;
            return (
              <div
                key={ws.id}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-1.5 cursor-pointer transition-all',
                  isActive
                    ? 'bg-primary/15 border border-primary/30'
                    : 'bg-white/6 border border-white/8 hover:bg-white/10',
                )}
                onClick={() => { onSelectWorkspace(ws.id); onClose(); }}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && (onSelectWorkspace(ws.id), onClose())}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold truncate', isActive ? 'text-primary' : 'text-white')}>
                    {ws.name}
                  </p>
                  {total > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden max-w-[80px]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-white/30 font-medium">{done}/{total}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteWorkspace(ws.id); }}
                  className="flex items-center justify-center w-9 h-9 rounded-2xl text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  aria-label={`Delete ${ws.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>

        {/* New workspace */}
        <div className="px-3 pb-2 pt-1 border-t border-white/8">
          <button
            onClick={() => { onNewWorkspace(); onClose(); }}
            className="w-full flex items-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Plus size={16} />
            New Workspace
          </button>
        </div>
      </div>
    </>
  );
}

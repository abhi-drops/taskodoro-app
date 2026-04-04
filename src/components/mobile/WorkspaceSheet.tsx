import { Plus, Trash2, CheckSquare } from 'lucide-react';
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
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Title row */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <CheckSquare size={16} className="text-primary" />
          <span className="font-semibold text-base flex-1">Workspaces</span>
        </div>

        {/* Workspace list — max height so it doesn't overflow */}
        <div className="overflow-y-auto max-h-[50dvh] px-3 py-2">
          {workspaces.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No workspaces yet</p>
          )}
          {workspaces.map(ws => {
            const { total, done } = ws.groups.reduce(
              (acc, g) => ({
                total: acc.total + g.todos.length,
                done: acc.done + g.todos.filter(t => t.completed).length,
              }),
              { total: 0, done: 0 },
            );
            return (
              <div
                key={ws.id}
                className={cn(
                  'group flex items-center gap-2 rounded-xl px-3 py-3 mb-1 cursor-pointer',
                  'hover:bg-accent transition-colors active:bg-accent',
                  ws.id === activeWorkspaceId && 'bg-accent font-medium',
                )}
                onClick={() => { onSelectWorkspace(ws.id); onClose(); }}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && (onSelectWorkspace(ws.id), onClose())}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{ws.name}</p>
                  {total > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">{done}/{total} done</p>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteWorkspace(ws.id); }}
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label={`Delete ${ws.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* New workspace */}
        <div className="px-3 pb-3 pt-1 border-t border-border">
          <button
            onClick={() => { onNewWorkspace(); onClose(); }}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus size={16} />
            New Workspace
          </button>
        </div>
      </div>
    </>
  );
}

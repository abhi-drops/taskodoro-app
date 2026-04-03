import { Plus, Trash2, CheckSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/types/index';

interface Props {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onNewWorkspace: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onDeleteWorkspace,
  onNewWorkspace,
  isOpen,
  onClose,
}: Props) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-60 bg-card border-r border-border',
          'transition-transform duration-200',
          'md:relative md:translate-x-0 md:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 h-14 shrink-0">
          <CheckSquare size={18} className="text-primary" />
          <span className="font-bold text-base tracking-tight flex-1">Workspaces</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={16} />
          </Button>
        </div>

        <Separator />

        {/* Workspace list */}
        <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-0.5">
            {workspaces.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                No workspaces yet
              </p>
            )}
            {workspaces.map(ws => (
              <WorkspaceItem
                key={ws.id}
                workspace={ws}
                isActive={ws.id === activeWorkspaceId}
                onSelect={() => { onSelectWorkspace(ws.id); onClose(); }}
                onDelete={() => onDeleteWorkspace(ws.id)}
              />
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {/* New workspace button */}
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={onNewWorkspace}
          >
            <Plus size={15} />
            New Workspace
          </Button>
        </div>
      </aside>
    </>
  );
}

interface WorkspaceItemProps {
  workspace: Workspace;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function WorkspaceItem({ workspace, isActive, onSelect, onDelete }: WorkspaceItemProps) {
  const totalTodos = workspace.groups.reduce((sum, g) => sum + g.todos.length, 0);
  const completedTodos = workspace.groups.reduce(
    (sum, g) => sum + g.todos.filter(t => t.completed).length, 0
  );

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer',
        'hover:bg-accent transition-colors',
        isActive && 'bg-accent font-medium',
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{workspace.name}</p>
        {totalTodos > 0 && (
          <p className="text-[10px] text-muted-foreground">{completedTodos}/{totalTodos} done</p>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-opacity"
        aria-label={`Delete workspace ${workspace.name}`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

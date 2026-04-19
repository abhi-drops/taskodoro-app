import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import appIcon from '@/assets/icon-new.png';
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
          className="fixed inset-0 z-30 md:hidden m3-fade-in"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-60 border-r border-white/8',
          'transition-transform duration-200',
          'md:relative md:translate-x-0 md:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'oklch(0.09 0.008 30)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 h-14 shrink-0 border-b border-white/8">
          <img src={appIcon} alt="Taskodoro" className="w-7 h-7 shrink-0" />
          <span className="font-bold text-sm text-white flex-1 tracking-tight">Taskodoro</span>
          <button
            className="btn-spring-icon h-7 w-7 md:hidden flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={14} />
          </button>
        </div>

        {/* Workspace list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {workspaces.length === 0 && (
            <p className="text-xs text-white/25 text-center py-8">No workspaces yet</p>
          )}
          {workspaces.map((ws, idx) => (
            <WorkspaceItem
              key={ws.id}
              workspace={ws}
              isActive={ws.id === activeWorkspaceId}
              onSelect={() => { onSelectWorkspace(ws.id); onClose(); }}
              onDelete={() => onDeleteWorkspace(ws.id)}
              index={idx}
            />
          ))}
        </div>

        {/* New workspace */}
        <div className="p-2 border-t border-white/8">
          <button
            onClick={onNewWorkspace}
            className="btn-spring w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white/40 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8"
          >
            <Plus size={14} />
            New Workspace
          </button>
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
  index?: number;
}

function WorkspaceItem({ workspace, isActive, onSelect, onDelete, index = 0 }: WorkspaceItemProps) {
  const { totalTodos, completedTodos } = workspace.groups.reduce(
    (acc, g) => ({
      totalTodos: acc.totalTodos + g.todos.length,
      completedTodos: acc.completedTodos + g.todos.filter(t => t.completed).length,
    }),
    { totalTodos: 0, completedTodos: 0 },
  );
  const pct = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  return (
    <div
      style={{ '--delay': `${index * 40}ms` } as React.CSSProperties}
      className={cn(
        'm3-list-item group flex items-center gap-2 rounded-2xl px-3 py-2.5 cursor-pointer transition-all',
        isActive
          ? 'bg-primary/12 border border-primary/25'
          : 'border border-transparent hover:bg-white/6 hover:border-white/8',
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
    >
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold truncate', isActive ? 'text-primary' : 'text-white/80')}>
          {workspace.name}
        </p>
        {totalTodos > 0 && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-white/25 font-medium shrink-0">{completedTodos}/{totalTodos}</span>
          </div>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="btn-spring-icon flex items-center justify-center w-7 h-7 text-white/15 hover:text-red-400 hover:bg-red-400/10 opacity-100 md:opacity-0 md:group-hover:opacity-100"
        aria-label={`Delete workspace ${workspace.name}`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

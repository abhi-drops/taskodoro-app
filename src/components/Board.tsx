import { GroupColumn } from '@/components/GroupColumn';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Layers } from 'lucide-react';
import type { Workspace } from '@/types/index';

interface Props {
  workspace: Workspace;
  onAddTodo: (groupId: string, text: string) => void;
  onToggleTodo: (groupId: string, todoId: string) => void;
  onDeleteTodo: (groupId: string, todoId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onOpenTask: (groupId: string, todoId: string) => void;
}

export function Board({ workspace, onAddTodo, onToggleTodo, onDeleteTodo, onDeleteGroup, onOpenTask }: Props) {
  if (workspace.groups.length === 0) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ background: 'oklch(0.07 0.005 30)' }}
      >
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-3xl bg-white/6 border border-white/8 p-5">
              <Layers size={32} className="text-white/25" />
            </div>
          </div>
          <p className="text-sm font-semibold text-white/40">No groups yet</p>
          <p className="text-xs text-white/20">Click &ldquo;New Group&rdquo; to get started</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea
      className="flex-1 w-full"
      style={{ background: 'oklch(0.07 0.005 30)' }}
    >
      <div className="flex gap-4 p-4 h-full">
        {workspace.groups.map(group => (
          <GroupColumn
            key={group.id}
            group={group}
            allGroups={workspace.groups}
            onAddTodo={text => onAddTodo(group.id, text)}
            onToggleTodo={todoId => onToggleTodo(group.id, todoId)}
            onDeleteTodo={todoId => onDeleteTodo(group.id, todoId)}
            onDeleteGroup={() => onDeleteGroup(group.id)}
            onOpenTask={todoId => onOpenTask(group.id, todoId)}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

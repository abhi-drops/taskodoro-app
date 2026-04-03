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
}

export function Board({ workspace, onAddTodo, onToggleTodo, onDeleteTodo, onDeleteGroup }: Props) {
  if (workspace.groups.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <Layers size={32} className="text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">No groups yet</p>
          <p className="text-xs text-muted-foreground/70">Click &ldquo;New Group&rdquo; to get started</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 w-full">
      <div className="flex gap-4 p-4 h-full">
        {workspace.groups.map(group => (
          <GroupColumn
            key={group.id}
            group={group}
            workspaceId={workspace.id}
            onAddTodo={text => onAddTodo(group.id, text)}
            onToggleTodo={todoId => onToggleTodo(group.id, todoId)}
            onDeleteTodo={todoId => onDeleteTodo(group.id, todoId)}
            onDeleteGroup={() => onDeleteGroup(group.id)}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

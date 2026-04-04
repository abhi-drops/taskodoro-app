export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  text: string;
  createdAt: number;
}

export interface Todo {
  id: string;
  sn: number;
  text: string;
  completed: boolean;
  createdAt: number;
  description?: string;
  priority?: TaskPriority;
  color?: string;
  tags?: string[];
  comments?: TaskComment[];
  endTime?: number;
  subtasks?: SubTask[];
}

export interface GroupSettings {
  onCompleteMoveTo?: string | null;
}

export interface Group {
  id: string;
  name: string;
  todos: Todo[];
  nextSn: number;
  createdAt: number;
  settings?: GroupSettings;
}

export interface Workspace {
  id: string;
  name: string;
  groups: Group[];
  createdAt: number;
}

export interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
}

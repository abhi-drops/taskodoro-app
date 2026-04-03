export interface Todo {
  id: string;
  sn: number;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface Group {
  id: string;
  name: string;
  todos: Todo[];
  nextSn: number;
  createdAt: number;
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

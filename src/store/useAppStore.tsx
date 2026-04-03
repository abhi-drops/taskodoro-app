import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { arrayMove } from '@dnd-kit/sortable';
import type { AppState, Workspace, Group, Todo } from '@/types/index';

const STORAGE_KEY = 'app_state';

const initialState: AppState = {
  workspaces: [],
  activeWorkspaceId: null,
};

type AppAction =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_WORKSPACE'; payload: { name: string } }
  | { type: 'DELETE_WORKSPACE'; payload: { id: string } }
  | { type: 'SET_ACTIVE_WORKSPACE'; payload: { id: string } }
  | { type: 'RENAME_WORKSPACE'; payload: { id: string; name: string } }
  | { type: 'ADD_GROUP'; payload: { workspaceId: string; name: string } }
  | { type: 'DELETE_GROUP'; payload: { workspaceId: string; groupId: string } }
  | { type: 'RENAME_GROUP'; payload: { workspaceId: string; groupId: string; name: string } }
  | { type: 'ADD_TODO'; payload: { workspaceId: string; groupId: string; text: string } }
  | { type: 'TOGGLE_TODO'; payload: { workspaceId: string; groupId: string; todoId: string } }
  | { type: 'DELETE_TODO'; payload: { workspaceId: string; groupId: string; todoId: string } }
  | { type: 'MOVE_TODO'; payload: { workspaceId: string; todoId: string; fromGroupId: string; toGroupId: string; overIndex?: number } }
  | { type: 'REORDER_TODO'; payload: { workspaceId: string; groupId: string; activeIndex: number; overIndex: number } };

function updateWorkspace(state: AppState, workspaceId: string, fn: (ws: Workspace) => Workspace): AppState {
  return {
    ...state,
    workspaces: state.workspaces.map(ws => ws.id === workspaceId ? fn(ws) : ws),
  };
}

function updateGroup(workspace: Workspace, groupId: string, fn: (g: Group) => Group): Workspace {
  return {
    ...workspace,
    groups: workspace.groups.map(g => g.id === groupId ? fn(g) : g),
  };
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    case 'ADD_WORKSPACE': {
      const newWs: Workspace = {
        id: crypto.randomUUID(),
        name: action.payload.name,
        groups: [],
        createdAt: Date.now(),
      };
      return {
        workspaces: [...state.workspaces, newWs],
        activeWorkspaceId: state.activeWorkspaceId ?? newWs.id,
      };
    }

    case 'DELETE_WORKSPACE': {
      const filtered = state.workspaces.filter(ws => ws.id !== action.payload.id);
      let nextActive = state.activeWorkspaceId;
      if (nextActive === action.payload.id) {
        nextActive = filtered.length > 0 ? filtered[filtered.length - 1].id : null;
      }
      return { workspaces: filtered, activeWorkspaceId: nextActive };
    }

    case 'SET_ACTIVE_WORKSPACE':
      return { ...state, activeWorkspaceId: action.payload.id };

    case 'RENAME_WORKSPACE':
      return updateWorkspace(state, action.payload.id, ws => ({ ...ws, name: action.payload.name }));

    case 'ADD_GROUP':
      return updateWorkspace(state, action.payload.workspaceId, ws => ({
        ...ws,
        groups: [...ws.groups, {
          id: crypto.randomUUID(),
          name: action.payload.name,
          todos: [],
          nextSn: 1,
          createdAt: Date.now(),
        }],
      }));

    case 'DELETE_GROUP':
      return updateWorkspace(state, action.payload.workspaceId, ws => ({
        ...ws,
        groups: ws.groups.filter(g => g.id !== action.payload.groupId),
      }));

    case 'RENAME_GROUP':
      return updateWorkspace(state, action.payload.workspaceId, ws =>
        updateGroup(ws, action.payload.groupId, g => ({ ...g, name: action.payload.name }))
      );

    case 'ADD_TODO': {
      return updateWorkspace(state, action.payload.workspaceId, ws =>
        updateGroup(ws, action.payload.groupId, g => {
          const newTodo: Todo = {
            id: crypto.randomUUID(),
            sn: g.nextSn,
            text: action.payload.text,
            completed: false,
            createdAt: Date.now(),
          };
          return { ...g, nextSn: g.nextSn + 1, todos: [...g.todos, newTodo] };
        })
      );
    }

    case 'TOGGLE_TODO':
      return updateWorkspace(state, action.payload.workspaceId, ws =>
        updateGroup(ws, action.payload.groupId, g => ({
          ...g,
          todos: g.todos.map(t => t.id === action.payload.todoId ? { ...t, completed: !t.completed } : t),
        }))
      );

    case 'DELETE_TODO':
      return updateWorkspace(state, action.payload.workspaceId, ws =>
        updateGroup(ws, action.payload.groupId, g => ({
          ...g,
          todos: g.todos.filter(t => t.id !== action.payload.todoId),
        }))
      );

    case 'MOVE_TODO': {
      const { workspaceId, todoId, fromGroupId, toGroupId, overIndex } = action.payload;
      return updateWorkspace(state, workspaceId, ws => {
        const fromGroup = ws.groups.find(g => g.id === fromGroupId);
        if (!fromGroup) return ws;
        const todo = fromGroup.todos.find(t => t.id === todoId);
        if (!todo) return ws;
        return {
          ...ws,
          groups: ws.groups.map(g => {
            if (g.id === fromGroupId) {
              return { ...g, todos: g.todos.filter(t => t.id !== todoId) };
            }
            if (g.id === toGroupId) {
              const newTodos = [...g.todos];
              const insertAt = overIndex !== undefined && overIndex >= 0 ? overIndex : newTodos.length;
              newTodos.splice(insertAt, 0, todo);
              return { ...g, todos: newTodos };
            }
            return g;
          }),
        };
      });
    }

    case 'REORDER_TODO':
      return updateWorkspace(state, action.payload.workspaceId, ws =>
        updateGroup(ws, action.payload.groupId, g => ({
          ...g,
          todos: arrayMove(g.todos, action.payload.activeIndex, action.payload.overIndex),
        }))
      );

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  isLoaded: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Preferences.get({ key: STORAGE_KEY }).then(({ value }) => {
      if (value) {
        try {
          dispatch({ type: 'LOAD_STATE', payload: JSON.parse(value) as AppState });
        } catch {
          // corrupted data — start fresh
        }
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(state) });
  }, [state, isLoaded]);

  return (
    <AppContext.Provider value={{ state, dispatch, isLoaded }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}

import type { Todo, TodoSortKey, TodoFilterKey, Group } from '@/types/index';

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function applyGroupView(
  todos: Todo[],
  sortBy: TodoSortKey = 'none',
  filterBy: TodoFilterKey = 'all',
  filterByLastGroup?: string,
): Todo[] {
  let result = todos;
  if (filterBy === 'incomplete') result = todos.filter(t => !t.completed);
  else if (filterBy === 'completed') result = todos.filter(t => t.completed);
  else if (filterBy === 'lastGroup' && filterByLastGroup)
    result = todos.filter(t => t.lastGroupId === filterByLastGroup);

  if (sortBy === 'none') return result;
  result = [...result];
  if (sortBy === 'priority')
    result.sort((a, b) => (PRIORITY_RANK[a.priority ?? 'low'] ?? 3) - (PRIORITY_RANK[b.priority ?? 'low'] ?? 3));
  else if (sortBy === 'dueDate')
    result.sort((a, b) => (a.endTime ?? Infinity) - (b.endTime ?? Infinity));
  else if (sortBy === 'createdAt')
    result.sort((a, b) => a.createdAt - b.createdAt);
  else if (sortBy === 'alpha')
    result.sort((a, b) => a.text.localeCompare(b.text));
  else if (sortBy === 'completedLast')
    result.sort((a, b) => Number(a.completed) - Number(b.completed));
  else if (sortBy === 'lastGroup')
    result.sort((a, b) => {
      // undefined lastGroupId (never moved) sorts last
      if (!a.lastGroupId && !b.lastGroupId) return 0;
      if (!a.lastGroupId) return 1;
      if (!b.lastGroupId) return -1;
      return a.lastGroupId.localeCompare(b.lastGroupId);
    });
  return result;
}

export interface LastGroupSection {
  label: string;
  todos: Todo[];
}

export function groupByLastGroup(todos: Todo[], allGroups: Group[]): LastGroupSection[] {
  const nameMap = new Map(allGroups.map(g => [g.id, g.name]));
  const sections = new Map<string, LastGroupSection>();
  const noOrigin: Todo[] = [];

  for (const todo of todos) {
    if (!todo.lastGroupId) {
      noOrigin.push(todo);
    } else {
      const label = nameMap.get(todo.lastGroupId) ?? 'Unknown';
      if (!sections.has(todo.lastGroupId)) {
        sections.set(todo.lastGroupId, { label, todos: [] });
      }
      sections.get(todo.lastGroupId)!.todos.push(todo);
    }
  }

  const result = Array.from(sections.values()).sort((a, b) => a.label.localeCompare(b.label));
  if (noOrigin.length > 0) result.push({ label: 'This group', todos: noOrigin });
  return result;
}

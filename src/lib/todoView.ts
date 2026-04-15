import type { Todo, TodoSortKey, TodoFilterKey } from '@/types/index';

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function applyGroupView(
  todos: Todo[],
  sortBy: TodoSortKey = 'none',
  filterBy: TodoFilterKey = 'all',
): Todo[] {
  let result = todos;
  if (filterBy === 'incomplete') result = todos.filter(t => !t.completed);
  else if (filterBy === 'completed') result = todos.filter(t => t.completed);

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
  return result;
}

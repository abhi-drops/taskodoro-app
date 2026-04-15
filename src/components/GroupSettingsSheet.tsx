import { Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Group, GroupSettings, TodoSortKey, TodoFilterKey } from '@/types/index';
import type { AppAction } from '@/store/useAppStore';

type Dispatch = React.Dispatch<AppAction>;

interface Props {
  group: Group;
  allGroups: Group[];
  workspaceId: string;
  onClose: () => void;
  dispatch: Dispatch;
}

const SORT_OPTIONS: { key: TodoSortKey; label: string }[] = [
  { key: 'none',          label: 'None' },
  { key: 'completedLast', label: 'Active first' },
  { key: 'priority',      label: 'Priority' },
  { key: 'dueDate',       label: 'Due date' },
  { key: 'createdAt',     label: 'Created' },
  { key: 'alpha',         label: 'A → Z' },
];

const FILTER_OPTIONS: { key: TodoFilterKey; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'incomplete', label: 'Incomplete' },
  { key: 'completed',  label: 'Completed' },
];

export function GroupSettingsSheet({ group, allGroups, workspaceId, onClose, dispatch }: Props) {
  const otherGroups = allGroups.filter(g => g.id !== group.id);
  const currentTarget = group.settings?.onCompleteMoveTo ?? '';
  const currentSort = group.settings?.sortBy ?? 'none';
  const currentFilter = group.settings?.filterBy ?? 'all';

  function handleMoveTargetChange(value: string) {
    const settings: GroupSettings = {
      onCompleteMoveTo: value === '' ? null : value,
    };
    dispatch({ type: 'UPDATE_GROUP_SETTINGS', payload: { workspaceId, groupId: group.id, settings } });
  }

  function handleSortChange(key: TodoSortKey) {
    dispatch({ type: 'UPDATE_GROUP_SETTINGS', payload: { workspaceId, groupId: group.id, settings: { sortBy: key } } });
  }

  function handleFilterChange(key: TodoFilterKey) {
    dispatch({ type: 'UPDATE_GROUP_SETTINGS', payload: { workspaceId, groupId: group.id, settings: { filterBy: key } } });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 m3-fade-in"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-settings-title"
        className="m3-sheet fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 shadow-2xl"
        style={{
          background: 'oklch(0.1 0.008 30)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
          <div className="w-8 h-8 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
            <Settings size={15} className="text-white/50" />
          </div>
          <h2 id="group-settings-title" className="font-bold text-base text-white flex-1 truncate">
            {group.name}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-2xl bg-white/8 text-white/40 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Settings body */}
        <div className="m3-content-reveal px-4 py-5 space-y-5 max-h-[70dvh] overflow-y-auto no-scrollbar">

          {/* Sort by */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/30 uppercase tracking-widest">
              Sort by
            </label>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleSortChange(opt.key)}
                  className={cn(
                    'btn-spring-pill px-3.5 h-8 text-sm font-semibold',
                    currentSort === opt.key
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-white/8 text-white/50 hover:text-white hover:bg-white/15',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter by */}
          <div className="space-y-2 border-t border-white/8 pt-5">
            <label className="text-xs font-bold text-white/30 uppercase tracking-widest">
              Filter by
            </label>
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleFilterChange(opt.key)}
                  className={cn(
                    'btn-spring-pill px-3.5 h-8 text-sm font-semibold',
                    currentFilter === opt.key
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-white/8 text-white/50 hover:text-white hover:bg-white/15',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* On complete, move task to */}
          <div className="border-t border-white/8 pt-5 space-y-1">
            <label className="text-xs font-bold text-white/30 uppercase tracking-widest">
              On complete, move task to
            </label>
            <p className="text-xs text-white/30">
              When a task is checked, automatically send it to another group.
            </p>
          </div>
          <select
            value={currentTarget}
            onChange={e => handleMoveTargetChange(e.target.value)}
            className="w-full h-12 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            style={{ colorScheme: 'dark' }}
          >
            <option value="">None</option>
            {otherGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {otherGroups.length === 0 && (
            <p className="text-xs text-white/20 italic">No other groups in this workspace.</p>
          )}
        </div>
      </div>
    </>
  );
}

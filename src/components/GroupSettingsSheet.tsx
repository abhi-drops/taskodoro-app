import { Settings, X } from 'lucide-react';
import type { Group, GroupSettings } from '@/types/index';
import type { AppAction } from '@/store/useAppStore';

type Dispatch = React.Dispatch<AppAction>;

interface Props {
  group: Group;
  allGroups: Group[];
  workspaceId: string;
  onClose: () => void;
  dispatch: Dispatch;
}

export function GroupSettingsSheet({ group, allGroups, workspaceId, onClose, dispatch }: Props) {
  const otherGroups = allGroups.filter(g => g.id !== group.id);
  const currentTarget = group.settings?.onCompleteMoveTo ?? '';

  function handleMoveTargetChange(value: string) {
    const settings: GroupSettings = {
      onCompleteMoveTo: value === '' ? null : value,
    };
    dispatch({ type: 'UPDATE_GROUP_SETTINGS', payload: { workspaceId, groupId: group.id, settings } });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-settings-title"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card border-t border-border shadow-xl animate-slide-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Settings size={18} className="text-muted-foreground shrink-0" />
          <h2 id="group-settings-title" className="font-semibold text-base flex-1 truncate">
            {group.name}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Settings body */}
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              On complete, move task to
            </label>
            <p className="text-xs text-muted-foreground">
              When a task is checked, automatically send it to another group.
            </p>
            <select
              value={currentTarget}
              onChange={e => handleMoveTargetChange(e.target.value)}
              className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">None</option>
              {otherGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {otherGroups.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No other groups in this workspace.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

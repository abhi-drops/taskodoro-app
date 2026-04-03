import { PanelLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Props {
  workspaceName: string;
  onNewGroup: () => void;
  onToggleSidebar: () => void;
}

export function BoardHeader({ workspaceName, onNewGroup, onToggleSidebar }: Props) {
  return (
    <header className="flex items-center gap-3 px-4 h-14 border-b border-border bg-background/95 backdrop-blur shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-11 w-11"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <PanelLeft size={18} />
      </Button>
      <Separator orientation="vertical" className="h-5 md:hidden" />
      <h1 className="flex-1 font-semibold text-base truncate">{workspaceName}</h1>
      <Button size="sm" onClick={onNewGroup} className="gap-1.5">
        <Plus size={15} />
        New Group
      </Button>
    </header>
  );
}

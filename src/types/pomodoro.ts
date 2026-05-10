export interface PomodoroBlock {
  id: string;
  type: 'work' | 'break';
  label: string;
  durationMins: number;
  taskId?: string;
  groupId?: string;
  completed: boolean;
  isCounter?: boolean;
  counterValue?: number;
  counterTarget?: number;
}

export interface PomodoroSession {
  blocks: PomodoroBlock[];
  totalMins: number;
}

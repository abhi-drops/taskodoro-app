export interface PomodoroBlock {
  id: string;
  type: 'work' | 'break';
  label: string;
  durationMins: number;
  taskId?: string;
  groupId?: string;
  completed: boolean;
}

export interface PomodoroSession {
  blocks: PomodoroBlock[];
  totalMins: number;
}

import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface NativePomodoroBlock {
  id: string;
  type: 'work' | 'break';
  label: string;
  durationMins: number;
  taskId?: string;
  groupId?: string;
  completed: boolean;
}

export interface PomodoroStartOptions {
  blocks: NativePomodoroBlock[];
  blockIdx: number;
  timeLeftSeconds: number;
}

export interface PomodoroState {
  blockIdx: number;
  timeLeftSeconds: number;
  isRunning: boolean;
  blockType: 'work' | 'break';
  blockLabel: string;
  totalSeconds: number;
  isExpired: boolean;
}

export type PomodoroEventType =
  | 'blockExpired'
  | 'blockAdvanced'
  | 'sessionEnded'
  | 'pauseChanged'
  | 'addedFive';

export interface PomodoroEvent {
  eventType: PomodoroEventType;
  blockIdx?: number;
  isRunning?: boolean;
}

export interface PomodoroTimerPlugin {
  start(options: PomodoroStartOptions): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  addFive(): Promise<void>;
  nextBlock(): Promise<void>;
  stop(): Promise<void>;
  getState(): Promise<PomodoroState>;
  requestNotificationPermission(): Promise<void>;

  addListener(
    event: 'timerTick',
    listener: (state: PomodoroState) => void,
  ): Promise<PluginListenerHandle>;

  addListener(
    event: 'timerEvent',
    listener: (event: PomodoroEvent) => void,
  ): Promise<PluginListenerHandle>;

  removeAllListeners(): Promise<void>;
}

export const PomodoroNative = registerPlugin<PomodoroTimerPlugin>('PomodoroTimer');

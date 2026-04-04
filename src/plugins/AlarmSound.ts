import { registerPlugin } from '@capacitor/core';

interface AlarmSoundPlugin {
  start(): Promise<void>;
  stop(): Promise<void>;
}

const AlarmSound = registerPlugin<AlarmSoundPlugin>('AlarmSound');

export { AlarmSound };

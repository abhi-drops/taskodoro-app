import { Haptics, ImpactStyle } from '@capacitor/haptics';

export function triggerHapticTap(): void {
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
    // Plugin unavailable on web — swallow silently
  });
}

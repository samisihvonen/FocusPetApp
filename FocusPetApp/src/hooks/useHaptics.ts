import { Vibration } from 'react-native';

/**
 * Haptic feedback wrapper.
 * Android supports vibration patterns; iOS supports only a single buzz.
 */
export function useHaptics() {
  /** Short double-buzz — step completed */
  const stepComplete = () => Vibration.vibrate([0, 50, 60, 80]);

  /** Victory rumble — whole task done */
  const taskComplete = () => Vibration.vibrate([0, 80, 50, 120, 50, 200]);

  /** Subtle tap — button press */
  const light = () => Vibration.vibrate(30);

  return { stepComplete, taskComplete, light };
}

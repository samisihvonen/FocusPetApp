import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { useHaptics } from './useHaptics';

/**
 * Encapsulates the "dopamine burst" effect:
 *   1. Vibration pattern
 *   2. Star-burst scale + fade animation
 *
 * Usage:
 *   const { starScale, starOpacity, triggerFeedback } = useDopamineFeedback();
 *   <StarBurst scale={starScale} opacity={starOpacity} />
 *   onStepDone={() => triggerFeedback()}
 */
export function useDopamineFeedback() {
  const starScale = useRef(new Animated.Value(0)).current;
  const starOpacity = useRef(new Animated.Value(0)).current;
  const { stepComplete } = useHaptics();

  const triggerFeedback = useCallback(() => {
    stepComplete();

    // Reset
    starScale.setValue(0);
    starOpacity.setValue(1);

    Animated.parallel([
      // Pop in
      Animated.spring(starScale, {
        toValue: 1,
        tension: 55,
        friction: 5,
        useNativeDriver: true,
      }),
      // Fade out after pop
      Animated.sequence([
        Animated.delay(380),
        Animated.timing(starOpacity, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [starScale, starOpacity, stepComplete]);

  return { starScale, starOpacity, triggerFeedback };
}

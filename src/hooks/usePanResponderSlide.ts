import { useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

export function usePanResponderSlide(
  slideAnim: Animated.Value,
  onDismiss: () => void
) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 150 || g.vy > 0.5) {
          Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true })
            .start(onDismiss);
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
        }
      },
    })
  ).current;

  return { panHandlers: panResponder.panHandlers };
}
import React from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

interface Props {
  scale: Animated.Value;
  opacity: Animated.Value;
}

export default function StarBurst({ scale, opacity }: Props) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { transform: [{ scale }], opacity }]}
    >
      <Text style={styles.stars}>⭐✨🌟✨⭐</Text>
      <Text style={styles.label}>HIENOA! +XP 🎉</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
    alignItems: 'center',
    zIndex: 999,
  },
  stars: { fontSize: 44, textAlign: 'center' },
  label: {
    color: '#FCD34D',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.5,
    textShadowColor: '#7C3AED',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
    marginTop: 4,
  },
});

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { usePetStore } from '../../store/usePetStore';
import { PetMood } from '../../types';
import { COLORS } from '../../constants/theme';

const PET_EMOJI: Record<PetMood, string> = {
  ecstatic: '🦉',
  happy: '🦉',
  neutral: '🦉',
  sad: '🦉',
};

const MOOD_AURA: Record<PetMood, string> = {
  ecstatic: '#FCD34D',
  happy: '#86EFAC',
  neutral: '#94A3B8',
  sad: '#FDA4AF',
};

const MOOD_LABEL: Record<PetMood, string> = {
  ecstatic: '😄 Huippu fiilis!',
  happy: '😊 Hyvin menee!',
  neutral: '😐 Ihan ok...',
  sad: '😢 Kaipaa huomiota',
};

export default function PetDisplay() {
  const { name, mood, happiness, accessories } = usePetStore();
  const bounceY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceY, { toValue: -12, duration: 700, useNativeDriver: true }),
        Animated.timing(bounceY, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.9, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ]),
    );
    bounce.start();
    glow.start();
    return () => {
      bounce.stop();
      glow.stop();
    };
  }, [bounceY, glowOpacity]);

  const auraColor = MOOD_AURA[mood];

  return (
    <View style={styles.container}>
      {/* Glow ring */}
      <Animated.View
        style={[styles.glow, { backgroundColor: auraColor, opacity: glowOpacity }]}
      />
      {/* Pet */}
      <Animated.View style={{ transform: [{ translateY: bounceY }] }}>
        <Text style={styles.petEmoji}>{PET_EMOJI[mood]}</Text>
        {accessories.length > 0 && (
          <Text style={styles.accessoryRow}>{accessories.join(' ')}</Text>
        )}
      </Animated.View>
      {/* Name & mood */}
      <Text style={[styles.name, { color: auraColor }]}>{name}</Text>
      {/* Happiness bar */}
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            { width: `${happiness}%` as any, backgroundColor: auraColor },
          ]}
        />
      </View>
      <Text style={styles.moodLabel}>{MOOD_LABEL[mood]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 16 },
  glow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    top: 12,
  },
  petEmoji: { fontSize: 86, textAlign: 'center' },
  accessoryRow: { fontSize: 22, textAlign: 'center', marginTop: -8 },
  name: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  barBg: {
    width: 130,
    height: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  moodLabel: { color: COLORS.textMuted, fontSize: 13, marginTop: 6 },
});

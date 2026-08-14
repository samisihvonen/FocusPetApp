import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Task } from '../../types';
import { COLORS, RADIUS, FONT } from '../../constants/theme';

interface Props {
  now?: Task | null;
  next?: Task | null;
  onDone?: (task: Task) => void;
}

export default function NowNextCard({ now, next, onDone }: Props) {
  const entrance = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 360, useNativeDriver: true }).start();
  }, [entrance]);

  const handlePress = (task?: Task | null) => {
    if (!task) return;
    Animated.sequence([
      Animated.spring(buttonScale, { toValue: 0.92, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }),
    ]).start(() => onDone?.(task));
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      <View style={styles.nowBox} accessibilityRole="summary">
        <Text style={styles.sectionTitle}>NYT</Text>
        {now ? (
          <>
            <Text style={styles.nowTitle}>{now.title}</Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => handlePress(now)}
              accessibilityLabel="Merkitse valmiiksi"
              activeOpacity={0.85}
            >
              <Animated.View style={{ transform: [{ scale: buttonScale }], alignItems: 'center' }}>
                <Text style={styles.doneText}>Valmis</Text>
              </Animated.View>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.empty}>Ei aktiivista tehtävää</Text>
        )}
      </View>

      <View style={styles.nextBox} accessibilityRole="region">
        <Text style={styles.sectionTitle}>SEURAAVAKSI</Text>
        {next ? <Text style={styles.nextTitle}>{next.title}</Text> : <Text style={styles.empty}>Ei seuraavaa</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 12,
  },
  nowBox: {
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  nextBox: {
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  sectionTitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '800' },
  nowTitle: { color: COLORS.text, fontSize: FONT.lg, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  nextTitle: { color: COLORS.text, fontSize: FONT.md, marginTop: 6, textAlign: 'center' },
  empty: { color: COLORS.textMuted, marginTop: 8 },
  doneButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
  },
  doneText: { color: '#fff', fontWeight: '800' },
});

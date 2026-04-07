import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Step } from '../../types';
import { COLORS, RADIUS } from '../../constants/theme';

interface Props {
  step: Step;
  onComplete: (stepId: string) => void;
  /** True when a prior step isn't finished yet */
  isLocked?: boolean;
  isCurrent?: boolean;
}

export default function StepItem({ step, onComplete, isLocked = false, isCurrent = false }: Props) {
  const bounceScale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (step.isDone || isLocked) {
      return;
    }
    Animated.sequence([
      Animated.timing(bounceScale, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.timing(bounceScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(() => onComplete(step.id));
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={[
        styles.container,
        step.isDone && styles.done,
        isLocked && styles.locked,
        isCurrent && styles.current,
      ]}
    >
      {/* Checkbox */}
      <Animated.Text style={[styles.check, { transform: [{ scale: bounceScale }] }]}>
        {step.isDone ? '✅' : isLocked ? '🔒' : '⬜'}
      </Animated.Text>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.emoji}>{step.emoji}</Text>
        <Text
          style={[
            styles.desc,
            step.isDone && styles.strikethrough,
            isLocked && styles.lockedText,
          ]}
        >
          {step.description}
        </Text>
      </View>

      {/* Rewards */}
      <View style={styles.rewards}>
        <Text style={styles.xp}>+{step.xpReward} XP</Text>
        <Text style={styles.coin}>🪙{step.coinReward}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginVertical: 5,
    gap: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  done: {
    backgroundColor: '#14532D',
    borderColor: COLORS.success,
    opacity: 0.85,
  },
  current: {
    borderColor: COLORS.star,
    shadowColor: COLORS.star,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  locked: { opacity: 0.38 },
  check: { fontSize: 24 },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 26 },
  desc: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '600' },
  strikethrough: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  lockedText: { color: COLORS.textDisabled },
  rewards: { alignItems: 'flex-end', gap: 2 },
  xp: { color: COLORS.xp, fontSize: 12, fontWeight: '700' },
  coin: { color: COLORS.coin, fontSize: 12, fontWeight: '700' },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

const XP_PER_LEVEL = 100;

interface Props {
  xp: number;
  level: number;
}

export default function XPBar({ xp, level }: Props) {
  const progress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  const xpInLevel = xp % XP_PER_LEVEL;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.level}>⚡ Taso {level}</Text>
        <Text style={styles.xpText}>
          {xpInLevel} / {XP_PER_LEVEL} XP
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` as any }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 12 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  level: { color: COLORS.xp, fontSize: 13, fontWeight: '700' },
  xpText: { color: COLORS.textMuted, fontSize: 11 },
  track: {
    height: 10,
    backgroundColor: COLORS.card,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: { height: 10, backgroundColor: COLORS.xp, borderRadius: 5 },
});

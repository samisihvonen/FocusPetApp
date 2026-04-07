import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

interface Props {
  coins: number;
}

export default function CoinCounter({ coins }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.icon}>🪙</Text>
      <Text style={styles.value}>{coins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  icon: { fontSize: 20 },
  value: { color: COLORS.coin, fontSize: 20, fontWeight: '900' },
});

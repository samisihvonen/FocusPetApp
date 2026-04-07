import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task } from '../../types';
import { COLORS, RADIUS, FONT } from '../../constants/theme';

// Kategoria-mappi tehtäville sen nimen perusteella
const TASK_ICONS: Record<string, string> = {
  siivoa: '🧹',
  petaa: '🛏️',
  läksyt: '📚',
  pakkaa: '🎒',
  pese: '🦷',
  ruokapöytä: '🍽️',
  vaatteet: '👚',
  lelut: '🧸',
  pelailla: '🎮',
  piirtää: '🎨',
  lue: '📖',
  liikunta: '🏃',
  syö: '🍴',
  nuku: '🛌',
  kävele: '🚶',
};

const TASK_CATEGORIES: Record<string, string> = {
  siivoa: 'SIIVOUS',
  petaa: 'SIIVOUS',
  ruokapöytä: 'RUOKA',
  pese: 'HYGIENIA',
  läksyt: 'OPISKELU',
  pakkaa: 'JÄRJESTYS',
  vaatteet: 'VAATTEET',
  lelut: 'PELIT',
  pelailla: 'VIIHDE',
  piirtää: 'LUOVUUS',
  lue: 'OPISKELU',
  liikunta: 'LIIKUNTA',
  syö: 'RUOKA',
  nuku: 'HYVINVOINTI',
  kävele: 'ULKOILU',
};

function getTaskIcon(taskTitle: string): string {
  const lower = taskTitle.toLowerCase();
  const match = Object.entries(TASK_ICONS).find(([key]) => lower.includes(key));
  return match ? match[1] : '✨';
}

function getTaskCategory(taskTitle: string): string {
  const lower = taskTitle.toLowerCase();
  const match = Object.entries(TASK_CATEGORIES).find(([key]) => lower.includes(key));
  return match ? match[1] : 'TEHTÄVÄ';
}

function getTimeSlot(taskTitle: string): { label: string; color: string } | null {
  const match = taskTitle.match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  if (hour < 10) {
    return { label: 'AAMU', color: '#F59E0B' };
  }
  if (hour < 16) {
    return { label: 'PAIVA', color: '#10B981' };
  }
  return { label: 'ILTA', color: '#60A5FA' };
}

interface Props {
  task: Task;
  onPress: (task: Task) => void;
}

export default function TaskCardBig({ task, onPress }: Props) {
  const done = task.steps.filter((s) => s.isDone).length;
  const total = task.steps.length;
  const icon = getTaskIcon(task.title);
  const category = getTaskCategory(task.title);
  const timeSlot = getTimeSlot(task.title);
  const progress = total > 0 ? done / total : 0;
  const isComplete = progress >= 1;

  return (
    <TouchableOpacity
      style={[styles.container, isComplete && styles.complete]}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      {/* Emoji icon */}
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{icon}</Text>
        {isComplete && <Text style={styles.badge}>✅</Text>}
      </View>

      {/* Progress indicator */}
      {!isComplete && (
        <View style={styles.progressDot}>
          <Text style={styles.progressText}>{done}/{total}</Text>
        </View>
      )}

      {/* Category */}
      {timeSlot && (
        <View style={[styles.slotChip, { backgroundColor: timeSlot.color }]}>
          <Text style={styles.slotText}>{timeSlot.label}</Text>
        </View>
      )}
      <Text style={styles.category}>{category}</Text>

      {/* Task title */}
      <Text style={[styles.title, isComplete && styles.titleDone]}>{task.title}</Text>

      {/* Progress bar */}
      {!isComplete && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    gap: 8,
  },
  complete: {
    backgroundColor: '#14532D',
    borderColor: COLORS.success,
  },

  iconBox: { position: 'relative' },
  icon: { fontSize: 64, textAlign: 'center' },
  badge: { position: 'absolute', bottom: 0, right: -4, fontSize: 24 },

  progressDot: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  slotChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  slotText: {
    color: '#0B1022',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  category: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 2,
  },

  title: {
    color: COLORS.text,
    fontSize: FONT.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  titleDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },

  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.bg,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: { height: 4, backgroundColor: COLORS.xp, borderRadius: 2 },
});

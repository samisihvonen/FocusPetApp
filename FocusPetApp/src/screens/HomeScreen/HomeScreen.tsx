import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useUserStore } from '../../store/useUserStore';
import { useTaskStore } from '../../store/useTaskStore';
import { usePetStore } from '../../store/usePetStore';
import XPBar from '../../components/XPBar/XPBar';
import TaskCardBig from '../../components/TaskCardBig/TaskCardBig';
import { Task } from '../../types';
import { COLORS, RADIUS, FONT } from '../../constants/theme';
import { useSpeechAssistant } from '../../hooks/useSpeechAssistant';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const ROUTINE_TITLE_REGEX = /^(?:([01]\d|2[0-3]):([0-5]\d))\s*[-–]\s*(.+)$/;

export default function HomeScreen({ navigation }: Props) {
  const { username, xp, level, streakDays, speechEnabled, toggleSpeech } = useUserStore();
  const { tasks, setActiveTask, ensureDailyRoutines } = useTaskStore();
  const { mood, happiness } = usePetStore();
  const { announceDailyPlan, isAvailable, speak } = useSpeechAssistant(speechEnabled);

  useEffect(() => {
    ensureDailyRoutines();
  }, [ensureDailyRoutines]);

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const sortedPendingTasks = [...pendingTasks].sort((a, b) => {
    const aMatch = a.title.match(ROUTINE_TITLE_REGEX);
    const bMatch = b.title.match(ROUTINE_TITLE_REGEX);

    const aMinutes = aMatch
      ? Number(aMatch[1]) * 60 + Number(aMatch[2])
      : Number.MAX_SAFE_INTEGER;
    const bMinutes = bMatch
      ? Number(bMatch[1]) * 60 + Number(bMatch[2])
      : Number.MAX_SAFE_INTEGER;

    if (aMinutes !== bMinutes) {
      return aMinutes - bMinutes;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
  const routineTasks = sortedPendingTasks.filter((task) => ROUTINE_TITLE_REGEX.test(task.title));
  const regularTasks = sortedPendingTasks.filter((task) => !ROUTINE_TITLE_REGEX.test(task.title));
  const completedToday = tasks.filter((t) => t.status === 'completed').length;
  const moodText = mood === 'ecstatic'
    ? 'Huippufiilis'
    : mood === 'happy'
    ? 'Iloinen'
    : mood === 'neutral'
    ? 'Rauhallinen'
    : 'Kaipaa huomiota';

  const handleStartTask = (task: Task) => {
    setActiveTask(task);
    navigation.navigate('FocusMode', { taskId: task.id });
  };

  const handleReadPlan = () => {
    announceDailyPlan(sortedPendingTasks.map(t => t.title));
  };

  const normalizeCommand = (command: string) =>
    command
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const handleVoiceCommand = (rawCommand: string) => {
    const command = normalizeCommand(rawCommand);

    if ((command.includes('aloita hammaspesu') || command.includes('avaa hammaspesu')) && sortedPendingTasks.length > 0) {
      const brushingTask = sortedPendingTasks.find(
        task => task.title.toLowerCase().includes('hamp') || task.steps.some(step => step.description.toLowerCase().includes('hamp')),
      );

      if (brushingTask) {
        handleStartTask(brushingTask);
        speak(`Avataan hammaspesu: ${brushingTask.title}.`);
        return;
      }
    }

    if (
      command.includes('tehtavapilkko') ||
      command.includes('uusi tehtava') ||
      command.includes('lisaa tehtava')
    ) {
      navigation.navigate('TaskBreaker');
      speak('Avataan tehtäväpilkkoja.');
      return;
    }

    if (command.includes('kuuntele suunnitelma') || command.includes('lue suunnitelma')) {
      handleReadPlan();
      return;
    }

    if ((command.includes('aloita') || command.includes('avaa')) && sortedPendingTasks[0]) {
      handleStartTask(sortedPendingTasks[0]);
      speak(`Aloitetaan tehtävä ${sortedPendingTasks[0].title}.`);
      return;
    }

    if (command.includes('puhe pois') && speechEnabled) {
      toggleSpeech();
      return;
    }

    if (command.includes('puhe paalle') && !speechEnabled) {
      toggleSpeech();
      speak('Puhe on nyt päällä.');
    }
  };

  const {
    isAvailable: voiceAvailable,
    isListening,
    transcript,
    error: voiceError,
    startListening,
    stopListening,
  } = useVoiceCommands({ onCommand: handleVoiceCommand });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hei, {username}! 🦉</Text>
            {streakDays > 0 && (
              <Text style={styles.streak}>🔥 {streakDays} päivän putki!</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <View style={styles.topIconRow}>
              <TouchableOpacity
                style={[
                  styles.topIconBtn,
                  speechEnabled && styles.topIconBtnActive,
                  !isAvailable && styles.audioBtnDisabled,
                ]}
                onPress={toggleSpeech}
                activeOpacity={0.8}
                disabled={!isAvailable}
              >
                <Text style={[styles.topIconText, speechEnabled && styles.topIconTextActive]}>
                  {speechEnabled ? '🔊' : '🔇'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.topIconBtn,
                  styles.topIconBtnPlan,
                  !isAvailable && styles.audioBtnDisabled,
                ]}
                onPress={handleReadPlan}
                activeOpacity={0.8}
                disabled={!isAvailable}
              >
                <Text style={[styles.topIconText, styles.topIconTextActive]}>🗣️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!isAvailable && (
          <Text style={styles.audioHintTop}>
            ⚠️ Puhetoiminnot eivät ole käytössä tässä buildissa.
          </Text>
        )}

        <View style={styles.owlStrip}>
          <Text style={styles.owlName}>🦉 Pöllö</Text>
          <Text style={styles.owlMood}>{moodText}</Text>
          <Text style={styles.owlHappiness}>💛 {happiness}%</Text>
        </View>

        {/* ─── XP progress ─────────────────────────────────── */}
        <XPBar xp={xp} level={level} />

        {/* ─── Quick stats ────────────────────────────────────
        <View style={styles.statsRow}>
          <StatBox label="Tehtävää" value={String(pendingTasks.length)} />
          <StatBox label="Tehty tänään" value={String(completedToday)} />
          <StatBox label="Taso" value={`${level}`} />
        </View>
 */}
        {routineTasks.length > 0 && (
          <View style={styles.routineSection}>
            <Text style={styles.sectionTitle}>🕒 Päivän rutiinit</Text>
            {routineTasks.map((task) => {
              const match = task.title.match(ROUTINE_TITLE_REGEX);
              const time = match?.[1] && match?.[2] ? `${match[1]}:${match[2]}` : '';
              const title = match?.[3] ?? task.title;

              return (
                <TouchableOpacity
                  key={task.id}
                  style={styles.routineRow}
                  onPress={() => handleStartTask(task)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.routineTime}>{time}</Text>
                  <Text style={styles.routineTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.routineAction}>Aloita</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ─── Add task CTA ─────────────────────────────────── */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('TaskBreaker')}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>✨ Lisää uusi tehtävä</Text>
        </TouchableOpacity>

        {/* 
        <View style={styles.voiceBox}>
          <TouchableOpacity
            style={[styles.voiceBtn, (!voiceAvailable || isListening) && styles.audioBtnDisabled]}
            onPress={isListening ? stopListening : startListening}
            disabled={!voiceAvailable}
            activeOpacity={0.85}
          >
            <Text style={styles.voiceBtnText}>{isListening ? '🎙️ Kuunnellaan...' : '🎤 Puhu komento'}</Text>
          </TouchableOpacity>

          <Text style={styles.voiceHint}>Komennot: “avaa tehtäväpilkkoja”, “kuuntele suunnitelma”, “aloita tehtävä”, “aloita hammaspesu”.</Text>
          {!!transcript && <Text style={styles.voiceTranscript}>Kuulin: {transcript}</Text>}
          {!!voiceError && <Text style={styles.voiceError}>{voiceError}</Text>}
        </View>
              */}
        {/* ─── Task list ────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>📋 Muut tehtävät</Text>

        {sortedPendingTasks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>Kaikki tehtävät tehty!</Text>
            <Text style={styles.emptySub}>Lisää uusi yllä olevasta napista</Text>
          </View>
        ) : regularTasks.length === 0 ? (
          <View style={styles.emptySmall}>
            <Text style={styles.emptySub}>Ei muita tehtäviä juuri nyt.</Text>
          </View>
        ) : (
          <View style={styles.taskGrid}>
            {regularTasks.map((task) => (
              <View key={task.id} style={styles.gridItem}>
                <TaskCardBig task={task} onPress={handleStartTask} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  topIconRow: {
    flexDirection: 'row',
    gap: 8,
  },
  topIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topIconBtnActive: {
    backgroundColor: 'rgba(34,197,94,0.28)',
    borderColor: COLORS.success,
  },
  topIconBtnPlan: {
    backgroundColor: 'rgba(56,189,248,0.22)',
    borderColor: '#38BDF8',
  },
  topIconText: {
    fontSize: 14,
  },
  topIconTextActive: {
    color: '#E0F2FE',
  },
  greeting: { color: COLORS.text, fontSize: FONT.xl, fontWeight: '800' },
  streak: { color: COLORS.streak, fontSize: 14, fontWeight: '700', marginTop: 2 },
  owlStrip: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  owlName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  owlMood: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  owlHappiness: {
    color: COLORS.coin,
    fontSize: 12,
    fontWeight: '800',
  },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { color: COLORS.xp, fontSize: 22, fontWeight: '900' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  addBtn: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 7,
  },
  addBtnText: { color: '#fff', fontSize: FONT.lg, fontWeight: '800' },

  audioBtnDisabled: {
    opacity: 0.45,
  },
  audioHintTop: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginHorizontal: 16,
    marginTop: 2,
  },
  voiceBox: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    padding: 14,
    gap: 6,
  },
  voiceBtn: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  voiceBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  voiceHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  voiceTranscript: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  voiceError: {
    color: '#FCA5A5',
    fontSize: 12,
    textAlign: 'center',
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT.lg,
    fontWeight: '800',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  routineSection: {
    marginTop: 14,
    marginHorizontal: 12,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 10,
  },
  routineTime: {
    color: COLORS.xp,
    fontSize: 14,
    fontWeight: '900',
    width: 48,
  },
  routineTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  routineAction: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '800',
  },

  empty: { alignItems: 'center', paddingVertical: 36 },
  emptySmall: { alignItems: 'center', paddingVertical: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyText: { color: COLORS.text, fontSize: FONT.lg, fontWeight: '700', marginTop: 8 },
  emptySub: { color: COLORS.textMuted, fontSize: 14, marginTop: 6 },

  taskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  gridItem: {
    width: '48%',
    marginBottom: 12,
  },
});

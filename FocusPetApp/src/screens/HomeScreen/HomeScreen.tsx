import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useUserStore } from '../../store/useUserStore';
import { useTaskStore } from '../../store/useTaskStore';
import { usePetStore } from '../../store/usePetStore';
import TaskCardBig from '../../components/TaskCardBig/TaskCardBig';
import { Task } from '../../types';
import { COLORS, RADIUS, FONT } from '../../constants/theme';
import { useSpeechAssistant } from '../../hooks/useSpeechAssistant';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';
import { fetchHobbyEventsForToday, fetchHobbyEventsForDay, HobbyEvent } from '../../services/wilmaSyncParser';
import { buildGeneratedTask } from '../../services/scheduleParser';
import { DAILY_ROUTINE_TEMPLATES, WEEKEND_ROUTINE_TEMPLATES } from '../../store/useTaskStore';
import NowNextCard from '../../components/NowNextCard/NowNextCard';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const ROUTINE_TITLE_REGEX = /^(?:([01]\d|2[0-3]):([0-5]\d))\s*[-–]\s*(.+)$/;

/** Returns true when current time is more than 2 hours before the scheduled time. */
function isRoutineTooEarly(timeStr: string, now: Date): boolean {
  const [hh, mm] = timeStr.split(':').map(Number);
  const scheduledMinutes = hh * 60 + mm;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes < scheduledMinutes - 120;
}

/** Returns reminder (2h past) or expired (3h past) based on scheduled time. */
function getRoutineTimeStatus(timeStr: string, now: Date): 'ok' | 'reminder' | 'expired' {
  const [hh, mm] = timeStr.split(':').map(Number);
  const scheduledMinutes = hh * 60 + mm;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const diff = nowMinutes - scheduledMinutes;
  if (diff >= 180) return 'expired';
  if (diff >= 120) return 'reminder';
  return 'ok';
}

function getTaskEmoji(title: string): string {
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('laksy')) return '📚';
  if (normalized.includes('välipala')) return '🍎';
  if (normalized.includes('ulkoilu')) return '🌳';
  if (normalized.includes('aamupala')) return '🥣';
  if (normalized.includes('hamp')) return '🪥';
  if (normalized.includes('vaatte')) return '👕';
  if (normalized.includes('reppu')) return '🎒';
  if (normalized.includes('paivallinen')) return '🍽️';
  if (normalized.includes('iltapala')) return '🥛';
  if (normalized.includes('laakke')) return '💊';
  if (normalized.includes('nukku')) return '🌙';
  return '✅';
}

const addMinutes = (t: string, min: number) => {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + min;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

export default function HomeScreen({ navigation }: Props) {
  const { username, xp, streakDays, speechEnabled, toggleSpeech, hobbyUrl } = useUserStore();
  const { tasks, setActiveTask, ensureDailyRoutines, removeTask, addTask, completeTask, lastHobbySyncDate, markHobbySynced } = useTaskStore();
  const { mood } = usePetStore();
  const { announceDailyPlan, isAvailable, speak } = useSpeechAssistant(speechEnabled);
  const [now, setNow] = useState(new Date());
  const remindedTasksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    ensureDailyRoutines();
  }, [ensureDailyRoutines]);

  // Auto-sync hobby calendar on mount — once per day
  useEffect(() => {
    if (!hobbyUrl) return;
    const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    if (lastHobbySyncDate === todayKey) return; // already synced today
    fetchHobbyEventsForToday(hobbyUrl)
      .then(events => {
        events.forEach(ev => {
          addTask(buildGeneratedTask({ time: addMinutes(ev.start, -30), title: `Valmistaudu — ${ev.title}` }));
          addTask(buildGeneratedTask({ time: ev.start, title: `🏒 ${ev.title}`, blockUntil: ev.end }));
          addTask(buildGeneratedTask({ time: ev.end, title: '🏠 Kotiin harrastuksesta' }));
        });
        markHobbySynced();
      })
      .catch(() => undefined); // silent fail — no internet or no events
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
  const routineEntries = useMemo(
    () =>
      routineTasks.map((task, idx) => {
        const match = task.title.match(ROUTINE_TITLE_REGEX);
        const time = match?.[1] && match?.[2] ? `${match[1]}:${match[2]}` : '';
        const title = match?.[3] ?? task.title;
        const emoji = getTaskEmoji(title);
        const tooEarly = time ? isRoutineTooEarly(time, now) : false;
        const timeStatus = time ? getRoutineTimeStatus(time, now) : 'ok';
        const prevTask = idx > 0 ? routineTasks[idx - 1] : null;
        const prevNotDone = prevTask !== null && prevTask.status !== 'completed';
        const isLocked = tooEarly || prevNotDone;
        const lockReason = tooEarly ? '🕐 Ei vielä' : '🔒 Edellinen kesken';

        return {
          task,
          time,
          title,
          emoji,
          isLocked,
          lockReason,
          timeStatus,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routineTasks, now],
  );
  const routineLockByTaskId = useMemo(
    () =>
      new Map(
        routineEntries.map((entry) => [
          entry.task.id,
          { isLocked: entry.isLocked, lockReason: entry.lockReason },
        ]),
      ),
    [routineEntries],
  );

  // Auto-remove expired tasks and announce one-time reminders
  useEffect(() => {
    routineEntries.forEach((entry) => {
      if (entry.timeStatus === 'expired') {
        removeTask(entry.task.id);
      } else if (
        entry.timeStatus === 'reminder' &&
        !entry.isLocked &&
        !remindedTasksRef.current.has(entry.task.id)
      ) {
        remindedTasksRef.current.add(entry.task.id);
        speak(`Muistutus! ${entry.title} on vielä tekemättä.`);
      }
    });
  }, [routineEntries, removeTask, speak]);

  // Only show non-expired entries
  const visibleRoutineEntries = useMemo(
    () => routineEntries.filter((e) => e.timeStatus !== 'expired'),
    [routineEntries],
  );
  const nowTask = useMemo(() => {
    const firstRoutine = visibleRoutineEntries.find(entry => !entry.isLocked)?.task ?? null;
    if (firstRoutine) {
      return firstRoutine;
    }
    return regularTasks[0] ?? null;
  }, [visibleRoutineEntries, regularTasks]);
  const nextTask = useMemo(() => {
    if (!nowTask) {
      return null;
    }

    const nextFromRoutines = visibleRoutineEntries.find(entry => entry.task.id !== nowTask.id)?.task ?? null;
    if (nextFromRoutines) {
      return nextFromRoutines;
    }

    return regularTasks.find(task => task.id !== nowTask.id) ?? null;
  }, [visibleRoutineEntries, nowTask, regularTasks]);
  const nowTimeText = now.toLocaleTimeString('fi-FI', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const nowDateText = now.toLocaleDateString('fi-FI', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
  const completedToday = tasks.filter((t) => t.status === 'completed').length;
  const moodEmoji = mood === 'ecstatic'
    ? '🤩'
    : mood === 'happy'
    ? '😄'
    : mood === 'neutral'
    ? '🙂'
    : '🥺';

  const handleStartTask = (task: Task) => {
    const lock = routineLockByTaskId.get(task.id);
    if (lock?.isLocked) {
      speak(lock.lockReason === '🕐 Ei vielä'
        ? 'Tämän rutiinin voi aloittaa kaksi tuntia ennen kellonaikaa.'
        : 'Tee ensin edellinen rutiini valmiiksi.');
      return;
    }

    setActiveTask(task);
    navigation.navigate('FocusMode', { taskId: task.id });
  };

  const handleReadPlan = () => {
    announceDailyPlan(sortedPendingTasks.map(t => t.title));
  };

  const handleCompleteNowTask = (task: Task) => {
    completeTask(task.id);
    speak(`Tehtävä ${task.title} tehty!`);
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
      command.includes('tehtäväpilkko') ||
      command.includes('uusi tehtävä') ||
      command.includes('lisää tehtävä')
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
  // Entrance animation for Now/Next card
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!nowTask) return;
    Animated.spring(entrance, {
      toValue: 1,
      useNativeDriver: true,
      speed: 12,
      bounciness: 8,
    }).start();
  }, [nowTask, entrance]);

  const nowNextAnimatedStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
      },
    ],
  };
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
            <Text style={styles.greeting}>Hei, {username}! {moodEmoji}</Text>
            {streakDays > 0 && (
              <Text style={styles.streak}>🔥 {streakDays} päivän putki!</Text>
            )}
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>✨ XP {xp}</Text>
            </View>
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
              <TouchableOpacity
                style={[styles.topIconBtn, styles.topIconBtnAdmin]}
                onPress={() => navigation.navigate('Admin')}
                activeOpacity={0.8}
              >
                <Text style={styles.topIconText}>⚙️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.topIconBtn, styles.topIconBtnCalendar]}
                onPress={() => navigation.navigate('WeekCalendar')}
                activeOpacity={0.8}
              >
                <Text style={styles.topIconText}>📅</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!isAvailable && (
          <Text style={styles.audioHintTop}>
            ⚠️ Puhetoiminnot eivät ole käytössä tässä buildissa.
          </Text>
        )}


        {/* ─── Quick stats ────────────────────────────────────
        <View style={styles.statsRow}>
          <StatBox label="Tehtävää" value={String(pendingTasks.length)} />
          <StatBox label="Tehty tänään" value={String(completedToday)} />
          <StatBox label="Taso" value={`${level}`} />
        </View>
 */}
        {nowTask && (
          <Animated.View style={nowNextAnimatedStyle}>
            <NowNextCard
              now={nowTask}
              next={nextTask}
              onDone={handleCompleteNowTask}
            />
          </Animated.View>
        )}

        {routineTasks.length > 0 && (
          <View style={styles.routineSection}>
            <Text style={styles.sectionTitle}>🕒 Päivän Tehtävät</Text>
            <View style={styles.clockCard}>
              <Text style={styles.digitalClockTime}>{nowTimeText}</Text>
              <Text style={styles.digitalClockDate}>{nowDateText}</Text>
              <Text style={styles.clockNowText}>Tehtävät näkyvät alla kellonajan mukaan.</Text>
            </View>

            {visibleRoutineEntries.map((entry) => (
              <TouchableOpacity
                key={`row-${entry.task.id}`}
                style={[
                  styles.routineRow,
                  entry.isLocked && styles.routineRowLocked,
                  entry.timeStatus === 'reminder' && !entry.isLocked && styles.routineRowReminder,
                ]}
                onPress={entry.isLocked ? undefined : () => handleStartTask(entry.task)}
                activeOpacity={entry.isLocked ? 1 : 0.85}
                disabled={entry.isLocked}
              >
                <Text style={styles.routineTime}>{entry.time}</Text>
                <Text style={styles.routineEmoji}>{entry.emoji}</Text>
                <Text style={[styles.routineTitle, entry.isLocked && styles.routineTitleLocked]} numberOfLines={1}>
                  {entry.title}
                </Text>
                {entry.isLocked
                  ? <Text style={styles.routineActionLocked}>{entry.lockReason}</Text>
                  : entry.timeStatus === 'reminder'
                  ? <Text style={styles.routineActionReminder}>⚠️ Myöhässä</Text>
                  : <Text style={styles.routineAction}>Aloita</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ─── Add task CTA (piilotettu — käytössä admin-paneelissa) ───────────
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('TaskBreaker')}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>✨ Lisää uusi tehtävä</Text>
        </TouchableOpacity>
        ─────────────────────────────────────────────────────────────────────── */}

        {/* ─── Tomorrow preview ─────────────────────────────── */}
        <TomorrowSection />

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

function TomorrowSection() {
  const hobbyUrl = useUserStore(s => s.hobbyUrl);
  const [tomorrowHobbies, setTomorrowHobbies] = useState<HobbyEvent[]>([]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  useEffect(() => {
    if (!hobbyUrl) return;
    fetchHobbyEventsForDay(hobbyUrl, tomorrow)
      .then(setTomorrowHobbies)
      .catch(() => setTomorrowHobbies([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hobbyUrl]);

  const dateLabel = tomorrow.toLocaleDateString('fi-FI', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  });
  const tomorrowDay = tomorrow.getDay();
  const isWeekend = tomorrowDay === 0 || tomorrowDay === 6;
  const templates = isWeekend ? WEEKEND_ROUTINE_TEMPLATES : DAILY_ROUTINE_TEMPLATES;
  const tag = isWeekend ? '🏖️ Viikonloppu' : '🏫 Koulupäivä';

  // Merge routine templates + hobby events, sorted by time
  type RowItem =
    | { kind: 'routine'; time: string; title: string }
    | { kind: 'hobby'; time: string; title: string; end: string };

  const rows: RowItem[] = [
    ...templates.map(t => ({ kind: 'routine' as const, time: t.time, title: t.title })),
    ...tomorrowHobbies.map(h => ({ kind: 'hobby' as const, time: h.start, title: h.title, end: h.end })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <View style={styles.tomorrowSection}>
      <Text style={styles.sectionTitle}>📆 Huomenna — {dateLabel}</Text>
      <View style={styles.tomorrowCard}>
        <Text style={styles.tomorrowTag}>{tag}</Text>
        {rows.map((row, i) =>
          row.kind === 'hobby' ? (
            <View key={`hobby-${i}`} style={[styles.tomorrowRow, styles.tomorrowRowHobby]}>
              <Text style={styles.tomorrowTime}>{row.time}</Text>
              <Text style={[styles.tomorrowTitle, styles.tomorrowTitleHobby]}>
                🏒 {row.title}
              </Text>
            </View>
          ) : (
            <View key={`routine-${row.time}`} style={styles.tomorrowRow}>
              <Text style={styles.tomorrowTime}>{row.time}</Text>
              <Text style={styles.tomorrowTitle}>{row.title}</Text>
            </View>
          ),
        )}
        <Text style={styles.tomorrowNote}>
          Rutiinit luodaan automaattisesti huomenna.
        </Text>
      </View>
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
  topIconBtnAdmin: {
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderColor: COLORS.primary,
  },
  topIconBtnCalendar: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: COLORS.success,
  },
  topIconText: {
    fontSize: 14,
  },
  topIconTextActive: {
    color: '#E0F2FE',
  },
  greeting: { color: COLORS.text, fontSize: FONT.xl, fontWeight: '800' },
  streak: { color: COLORS.streak, fontSize: 14, fontWeight: '700', marginTop: 2 },
  xpBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56,189,248,0.2)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  xpBadgeText: {
    color: '#E0F2FE',
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
  clockCard: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  digitalClockTime: {
    color: COLORS.xp,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 1,
  },
  digitalClockDate: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  clockNowText: {
    color: COLORS.textMuted,
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
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
  routineEmoji: {
    fontSize: 20,
    width: 24,
    textAlign: 'center',
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
  routineRowLocked: {
    opacity: 0.45,
    borderColor: 'transparent',
  },
  routineRowReminder: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  routineTitleLocked: {
    color: COLORS.textMuted,
  },
  routineActionLocked: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  routineActionReminder: {
    color: '#F59E0B',
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

  tomorrowSection: {
    marginTop: 8,
  },
  tomorrowCard: {
    marginHorizontal: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.lg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    opacity: 0.75,
  },
  tomorrowTag: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tomorrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: 12,
  },
  tomorrowRowHobby: {
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  tomorrowTime: {
    color: COLORS.xp,
    fontSize: 13,
    fontWeight: '800',
    width: 44,
  },
  tomorrowTitle: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tomorrowTitleHobby: {
    color: COLORS.text,
    fontWeight: '700',
  },
  tomorrowNote: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 2,
    fontStyle: 'italic',
  },
});

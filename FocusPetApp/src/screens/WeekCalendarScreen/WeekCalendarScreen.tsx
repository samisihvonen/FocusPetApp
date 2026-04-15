import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useUserStore } from '../../store/useUserStore';
import { COLORS, RADIUS, FONT } from '../../constants/theme';
import { fetchWeekCalendar, WeekDayData, SchoolLesson } from '../../services/wilmaSyncParser';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WeekCalendar'>;
};

const DAY_NAMES = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];

export default function WeekCalendarScreen({ navigation }: Props) {
  const { wilmaUrl, hobbyUrl } = useUserStore();
  const [weekData, setWeekData] = useState<WeekDayData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [scheduleDay, setScheduleDay] = useState<WeekDayData | null>(null);

  // Default to today's index (Mon=0 … Sun=6)
  useEffect(() => {
    const dow = new Date().getDay();
    setSelectedDay(dow === 0 ? 6 : dow - 1);
  }, []);

  const load = useCallback(async () => {
    if (!wilmaUrl && !hobbyUrl) {
      setError('Aseta Wilma- tai MyClub-kalenteri-URL ensin adminpaneelissa (⚙️).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchWeekCalendar(wilmaUrl, hobbyUrl);
      setWeekData(data);
    } catch {
      setError('Kalenterin haku epäonnistui.\nTarkista URL-asetukset (⚙️) ja internet-yhteys.');
    } finally {
      setLoading(false);
    }
  }, [wilmaUrl, hobbyUrl]);

  useEffect(() => { load(); }, [load]);

  const today = new Date();

  // Week label e.g. "7.–13.4.2026"
  const weekLabel = weekData
    ? (() => {
        const mon = weekData[0].date;
        const sun = weekData[6].date;
        const fmt = (d: Date) =>
          d.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' });
        return `${fmt(mon)} – ${fmt(sun)} ${sun.getFullYear()}`;
      })()
    : '';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Takaisin</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>📅 Viikkokalenteri</Text>
          {weekLabel ? <Text style={styles.weekLabel}>{weekLabel}</Text> : null}
        </View>
        <TouchableOpacity onPress={load} style={styles.refreshBtn} disabled={loading}>
          <Text style={styles.refreshText}>{loading ? '⏳' : '↻'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Haetaan kalenteria…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>🔄 Yritä uudelleen</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Day selector chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
          >
            {weekData!.map((day, i) => {
              const isToday = day.date.toDateString() === today.toDateString();
              const isSelected = i === selectedDay;
              const hasEvents = day.school !== null || day.hobbies.length > 0;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                    isToday && !isSelected && styles.chipToday,
                  ]}
                  onPress={() => setSelectedDay(i)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipDayName, isSelected && styles.chipTextSelected]}>
                    {DAY_NAMES[i]}
                  </Text>
                  <Text style={[styles.chipDate, isSelected && styles.chipTextSelected]}>
                    {day.date.getDate()}
                  </Text>
                  {hasEvents && (
                    <View style={[styles.dot, isSelected && styles.dotSelected]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Day detail */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {weekData && (
              <DayView
                day={weekData[selectedDay]}
                today={today}
                onPressSchool={() => setScheduleDay(weekData[selectedDay])}
              />
            )}
          </ScrollView>
        </>
      )}

      {/* ─── School schedule modal ───────────────────────────────── */}
      <Modal
        visible={scheduleDay !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setScheduleDay(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setScheduleDay(null)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              🏫{' '}
              {scheduleDay?.date.toLocaleDateString('fi-FI', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </Text>
            <TouchableOpacity onPress={() => setScheduleDay(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {scheduleDay?.lessons.length === 0 ? (
              <Text style={styles.noLessons}>Ei tunteja tällä päivällä.</Text>
            ) : (
              scheduleDay?.lessons.map((lesson, i) => (
                <View key={i} style={styles.lessonRow}>
                  <View style={styles.lessonTimeCol}>
                    <Text style={styles.lessonStart}>{lesson.start}</Text>
                    <Text style={styles.lessonEnd}>{lesson.end}</Text>
                  </View>
                  <View style={styles.lessonDivider} />
                  <Text style={styles.lessonEmoji}>{lesson.emoji}</Text>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonSubject}>{lesson.subject}</Text>
                    {lesson.room ? (
                      <Text style={styles.lessonMeta}>
                        📍 {lesson.room}{lesson.teacher ? `  •  ${lesson.teacher}` : ''}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DayView({
  day,
  today,
  onPressSchool,
}: {
  day: WeekDayData;
  today: Date;
  onPressSchool: () => void;
}) {
  const isToday = day.date.toDateString() === today.toDateString();
  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
  const hasSchool = day.school !== null;
  const hasHobbies = day.hobbies.length > 0;

  const dateLabel = day.date.toLocaleDateString('fi-FI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View>
      <View style={styles.dayHeaderRow}>
        <Text style={styles.dayHeaderText}>
          {dateLabel}{isToday ? '  📍 Tänään' : ''}
        </Text>
      </View>

      {!hasSchool && !hasHobbies ? (
        <View style={styles.emptyDay}>
          <Text style={styles.emptyEmoji}>{isWeekend ? '🎉' : '📅'}</Text>
          <Text style={styles.emptyLabel}>
            {isWeekend ? 'Vapaapäivä!' : 'Ei tapahtumia'}
          </Text>
        </View>
      ) : (
        <View style={styles.eventList}>
          {hasSchool && (
            <TouchableOpacity
              style={[styles.eventCard, styles.schoolCard]}
              onPress={onPressSchool}
              activeOpacity={0.85}
            >
              <View style={styles.eventCardLeft}>
                <Text style={styles.eventCardEmoji}>🏫</Text>
                <View style={styles.eventCardInfo}>
                  <Text style={styles.eventCardTitle}>Koulu</Text>
                  <Text style={styles.eventCardTime}>
                    {day.school!.schoolStart} – {day.school!.schoolEnd}
                  </Text>
                  <Text style={styles.tapHint}>Katso tunnit →</Text>
                </View>
              </View>
              <View style={[styles.pill, styles.pillSchool]}>
                <Text style={styles.pillText}>koulu</Text>
              </View>
            </TouchableOpacity>
          )}
          {day.hobbies.map((ev, i) => (
            <View key={i} style={[styles.eventCard, styles.hobbyCard]}>
              <View style={styles.eventCardLeft}>
                <Text style={styles.eventCardEmoji}>🏒</Text>
                <View style={styles.eventCardInfo}>
                  <Text style={styles.eventCardTitle} numberOfLines={2}>
                    {ev.title}
                  </Text>
                  <Text style={styles.eventCardTime}>{ev.start} – {ev.end}</Text>
                </View>
              </View>
              <View style={[styles.pill, styles.pillHobby]}>
                <Text style={styles.pillText}>harrastus</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: { paddingVertical: 6, paddingRight: 8 },
  backText: { color: COLORS.textMuted, fontSize: FONT.md },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { color: COLORS.text, fontSize: FONT.lg, fontWeight: '700' },
  weekLabel: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
  refreshBtn: { padding: 6 },
  refreshText: { color: COLORS.textMuted, fontSize: FONT.lg },

  // ── Loading / error ──────────────────────────────────────
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  loadingText: { color: COLORS.textMuted, fontSize: FONT.md, marginTop: 12 },
  errorText: { color: COLORS.danger, fontSize: FONT.md, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  retryText: { color: COLORS.text, fontSize: FONT.md, fontWeight: '600' },

  // ── Day chips ────────────────────────────────────────────
  chipScroll: { flexGrow: 0, paddingBottom: 4 },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    width: 48,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    gap: 2,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipToday: {
    borderColor: COLORS.xp,
    borderWidth: 2,
  },
  chipDayName: { color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '600' },
  chipDate: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700' },
  chipTextSelected: { color: '#fff' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.warning },
  dotSelected: { backgroundColor: '#fff' },

  // ── Scroll area ───────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  // ── Day header ────────────────────────────────────────────
  dayHeaderRow: { marginBottom: 12 },
  dayHeaderText: {
    color: COLORS.text,
    fontSize: FONT.md,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // ── Empty state ───────────────────────────────────────────
  emptyDay: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyLabel: { color: COLORS.textMuted, fontSize: FONT.lg, fontWeight: '600' },

  // ── Event cards ───────────────────────────────────────────
  eventList: { gap: 12 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
  },
  schoolCard: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderColor: 'rgba(56,189,248,0.4)',
  },
  hobbyCard: {
    backgroundColor: 'rgba(251,146,60,0.12)',
    borderColor: 'rgba(251,146,60,0.4)',
  },
  eventCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  eventCardEmoji: { fontSize: 28 },
  eventCardInfo: { flex: 1 },
  eventCardTitle: {
    color: COLORS.text,
    fontSize: FONT.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  eventCardTime: { color: COLORS.textMuted, fontSize: FONT.sm },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillSchool: { backgroundColor: 'rgba(56,189,248,0.25)' },
  pillHobby: { backgroundColor: 'rgba(251,146,60,0.25)' },
  pillText: { color: COLORS.text, fontSize: 10, fontWeight: '600' },
  tapHint: { color: 'rgba(56,189,248,0.9)', fontSize: FONT.sm, marginTop: 3 },

  // ── School schedule modal ─────────────────────────────────
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '75%',
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },
  modalHandle: {
    width: 40, height: 4,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700', flex: 1 },
  modalClose: { padding: 4 },
  modalCloseText: { color: COLORS.textMuted, fontSize: FONT.lg },
  noLessons: {
    color: COLORS.textMuted, fontSize: FONT.md,
    textAlign: 'center', paddingVertical: 32,
  },

  // ── Lesson rows ───────────────────────────────────────────
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgDeep,
    gap: 10,
  },
  lessonTimeCol: { width: 44, alignItems: 'flex-end' },
  lessonStart: { color: COLORS.text, fontSize: FONT.sm, fontWeight: '700' },
  lessonEnd: { color: COLORS.textMuted, fontSize: 10 },
  lessonDivider: {
    width: 2, height: 32,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 1,
  },
  lessonEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  lessonInfo: { flex: 1 },
  lessonSubject: { color: COLORS.text, fontSize: FONT.md, fontWeight: '600' },
  lessonMeta: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 1 },
});

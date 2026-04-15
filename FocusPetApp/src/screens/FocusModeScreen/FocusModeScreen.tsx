import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useTaskStore } from '../../store/useTaskStore';
import { useUserStore } from '../../store/useUserStore';
import { usePetStore } from '../../store/usePetStore';
import { useDopamineFeedback } from '../../hooks/useDopamineFeedback';
import { useHaptics } from '../../hooks/useHaptics';
import StepItem from '../../components/StepItem/StepItem';
import StarBurst from '../../components/StarBurst/StarBurst';
import BrushingTimer from '../../components/BrushingTimer/BrushingTimer';
import { COLORS, FONT, RADIUS } from '../../constants/theme';
import { useSpeechAssistant } from '../../hooks/useSpeechAssistant';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FocusMode'>;
  route: RouteProp<RootStackParamList, 'FocusMode'>;
};

export default function FocusModeScreen({ navigation, route }: Props) {
  const { taskId } = route.params;
  const { tasks, completeStep, completeTask } = useTaskStore();
  const { addXP, addCoins, checkStreak, speechEnabled } = useUserStore();
  const { feed } = usePetStore();
  const { starScale, starOpacity, triggerFeedback } = useDopamineFeedback();
  const { taskComplete: taskCompleteHaptic } = useHaptics();
  const { speak, isAvailable } = useSpeechAssistant(speechEnabled);
  const [allDone, setAllDone] = useState(false);
  const [brushingStartToken, setBrushingStartToken] = useState(0);
  const celebScale = useRef(new Animated.Value(0)).current;
  const calmPulse = useRef(new Animated.Value(0.85)).current;
  const hasWelcomed = useRef(false);

  const task = tasks.find((t) => t.id === taskId);

  // ── Block Android back button in Focus Mode (parental control) ────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(calmPulse, { toValue: 1.05, duration: 1400, useNativeDriver: true }),
        Animated.timing(calmPulse, { toValue: 0.85, duration: 1400, useNativeDriver: true }),
      ]),
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [calmPulse]);

  useEffect(() => {
    hasWelcomed.current = false;
  }, [taskId]);

  useEffect(() => {
    if (!task || hasWelcomed.current) {
      return;
    }

    const firstPending = task.steps.find(s => !s.isDone);
    if (firstPending) {
      speak(`Aloitetaan rauhassa. Ensimmainen askel: ${firstPending.description}`);
    }
    hasWelcomed.current = true;
  }, [task, speak]);

  const handleStepComplete = (stepId: string) => {
    if (!task) {
      return;
    }

    // Read rewards before mutating
    const step = task.steps.find((s) => s.id === stepId);
    const willFinish = task.steps.every((s) => s.isDone || s.id === stepId);
    const stepIndex = task.steps.findIndex((s) => s.id === stepId);
    const nextStep = stepIndex >= 0 ? task.steps[stepIndex + 1] : undefined;

    completeStep(taskId, stepId);

    if (step) {
      addXP(step.xpReward);
      addCoins(step.coinReward);
      if (!willFinish && nextStep) {
        speak(`Hienoa! Seuraava askel: ${nextStep.description}`);
      }
    }

    triggerFeedback();

    if (willFinish) {
      setTimeout(() => {
        taskCompleteHaptic();
        completeTask(taskId);
        checkStreak();
        feed();
        setAllDone(true);
        speak('Mahtavaa! Kaikki askeleet tehty. Tehtava on valmis.');
        Animated.spring(celebScale, {
          toValue: 1,
          tension: 38,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 650);
    }
  };

  const doneCount = task?.steps.filter((s) => s.isDone).length ?? 0;
  const progress = task && task.steps.length > 0 ? doneCount / task.steps.length : 0;
  const remaining = task ? task.steps.length - doneCount : 0;
  const currentStep = task?.steps.find(
    (step, index) => !step.isDone && (index === 0 || !!task.steps[index - 1]?.isDone),
  );
  const isBrushingTask =
    !!task &&
    (task.title.toLowerCase().includes('hamp') ||
      task.steps.some(step => step.description.toLowerCase().includes('hamp')));

  const handleReadCurrentGuidance = () => {
    if (!task) {
      return;
    }

    if (currentStep) {
      speak(`Nyt vuorossa: ${currentStep.description}`);
      return;
    }

    speak(`Tehtava ${task.title} on valmis.`);
  };

  const handleVoiceCommand = (command: string) => {
    if (!task) {
      return;
    }

    if (command.includes('toista ohje') || command.includes('lue ohje') || command.includes('mita seuraavaksi')) {
      handleReadCurrentGuidance();
      return;
    }

    if ((command.includes('aloita harjaus') || command.includes('aloita hammaspesu')) && isBrushingTask) {
      setBrushingStartToken(prev => prev + 1);
      speak('Hammaspesu kaynnissa. Aloita ylaetuhampaista.');
      return;
    }

    if ((command.includes('seuraava askel') || command.includes('valmis') || command.includes('tehty')) && currentStep) {
      handleStepComplete(currentStep.id);
      return;
    }

    if (command.includes('kotiin')) {
      navigation.navigate('Home');
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

  if (!task) {
    return null;
  }

  const handleBrushingComplete = () => {
    if (!currentStep || currentStep.isDone) {
      return;
    }

    speak('Kaksi minuuttia taynna. Hienoa harjausta.');
    handleStepComplete(currentStep.id);
  };

  const handleBrushingSkip = () => {
    if (!currentStep || currentStep.isDone) {
      return;
    }
    speak('Hammaspesu ohitettu. Jatketaan seuraavaan askeleeseen.');
    handleStepComplete(currentStep.id);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Dopamine star burst overlay ─────────────────── */}
      <StarBurst scale={starScale} opacity={starOpacity} />

      {/* ── Task complete celebration ───────────────────── */}
      {allDone && (
        <Animated.View
          style={[styles.celebration, { transform: [{ scale: celebScale }] }]}
        >
          <Text style={styles.celebEmoji}>🎉🏆🎊</Text>
          <Text style={styles.celebTitle}>MAHTAVAA!</Text>
          <Text style={styles.celebSub}>Tehtävä suoritettu!</Text>
          <Text style={styles.celebRewards}>
            +{task.totalXP} XP  •  🪙 +{task.totalCoins}
          </Text>
          <View style={styles.homeBtn}>
            <Text
              style={styles.homeBtnText}
              onPress={() => navigation.navigate('Home')}
            >
              🏠 Kotiin →
            </Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Focus badge ─────────────────────────────────── */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🎯 KESKITTYMISTILA</Text>
          </View>
        </View>

        <View style={styles.calmCard}>
          <Animated.View style={[styles.calmPulse, { transform: [{ scale: calmPulse }] }]} />
          <Text style={styles.calmText}>🫧 Hengita rauhassa: sisaan 4, ulos 4</Text>
        </View>

        <View style={styles.voiceCard}>
          <TouchableOpacity
            style={[styles.voiceBtn, (!voiceAvailable || isListening) && styles.voiceBtnDisabled]}
            onPress={isListening ? stopListening : startListening}
            disabled={!voiceAvailable}
            activeOpacity={0.85}
          >
            <Text style={styles.voiceBtnText}>{isListening ? '🎙️ Kuunnellaan...' : '🎤 Puhu komento'}</Text>
          </TouchableOpacity>
          <Text style={styles.voiceHint}>
            Komennot: “toista ohje”, “seuraava askel”, “aloita hammaspesu”, “kotiin”.
          </Text>
          {!!transcript && <Text style={styles.voiceTranscript}>Kuulin: {transcript}</Text>}
          {!!voiceError && <Text style={styles.voiceError}>{voiceError}</Text>}
        </View>

        {!isAvailable && (
          <Text style={styles.audioHint}>
            Puheohjaus ei ole käytettävissä tässä buildissa. Visuaaliset vihjeet ja haptinen palaute toimivat silti.
          </Text>
        )}

        {/* ── Task title ──────────────────────────────────── */}
        <Text style={styles.taskTitle}>{task.title}</Text>

        {isBrushingTask && (
          <BrushingTimer
            autoStartToken={brushingStartToken}
            onComplete={handleBrushingComplete}
            onSkip={handleBrushingSkip}
            onZoneChange={(zone) => {
              speak(`Harjaa nyt alue: ${zone}.`);
            }}
          />
        )}

        {/* ── Progress bar ────────────────────────────────── */}
        <Text style={styles.progressLabel}>
          {doneCount} / {task.steps.length} askelta tehty
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` as any },
              progress >= 1 && styles.progressComplete,
            ]}
          />
        </View>

        {/* ── Steps ───────────────────────────────────────── */}
        <View style={styles.steps}>
          {task.steps.map((step, idx) => {
            const prevDone = idx === 0 || task.steps[idx - 1].isDone;
            return (
              <StepItem
                key={step.id}
                step={step}
                onComplete={handleStepComplete}
                isLocked={!prevDone}
                isCurrent={!step.isDone && prevDone}
              />
            );
          })}
        </View>

        {/* ── Motivational line ───────────────────────────── */}
        <Text style={styles.motivational}>
          {doneCount === 0
            ? '💪 Voit tehdä sen! Aloita ensimmäisestä askeleesta!'
            : remaining > 0
            ? `🔥 Hienoa! Enää ${remaining} askel${remaining > 1 ? 'ta' : ''} jäljellä!`
            : '🎉 Kaikki askeleet tehty — olet paras!'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgDeep },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 48 },

  badgeRow: { alignItems: 'center', paddingTop: 18, marginBottom: 8 },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 8,
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  calmCard: {
    marginBottom: 14,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  calmPulse: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(129,140,248,0.20)',
  },
  calmText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  voiceCard: {
    marginBottom: 12,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 6,
  },
  voiceBtn: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  voiceBtnDisabled: {
    opacity: 0.45,
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
  audioHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },

  taskTitle: {
    color: COLORS.text,
    fontSize: FONT.xxl,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 14,
    paddingHorizontal: 12,
    lineHeight: 36,
  },

  progressLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressTrack: {
    height: 12,
    backgroundColor: COLORS.card,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: 12,
    backgroundColor: COLORS.xp,
    borderRadius: 6,
  },
  progressComplete: { backgroundColor: COLORS.success },

  steps: {},

  motivational: {
    color: COLORS.pet,
    fontSize: FONT.md,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 24,
    lineHeight: 24,
  },

  // ── Celebration overlay ──────────────────────────────
  celebration: {
    position: 'absolute',
    inset: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,13,48,0.96)',
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  celebEmoji: { fontSize: 68 },
  celebTitle: {
    color: COLORS.star,
    fontSize: 52,
    fontWeight: '900',
    marginTop: 16,
    letterSpacing: 3,
  },
  celebSub: { color: COLORS.text, fontSize: FONT.lg, marginTop: 8 },
  celebRewards: {
    color: COLORS.xp,
    fontSize: FONT.xl,
    fontWeight: '800',
    marginTop: 18,
  },
  homeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 36,
    paddingVertical: 16,
    marginTop: 36,
  },
  homeBtnText: { color: '#fff', fontSize: FONT.lg, fontWeight: '800' },
});

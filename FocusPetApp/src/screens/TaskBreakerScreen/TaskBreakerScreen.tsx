import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import {
  breakTaskWithAI,
  generateDailyRoutineWithAI,
  generateFallbackSteps,
} from '../../services/taskBreaker';
import { useTaskStore } from '../../store/useTaskStore';
import { Task, Step } from '../../types';
import { COLORS, RADIUS, FONT } from '../../constants/theme';
import { useSpeechAssistant } from '../../hooks/useSpeechAssistant';
import { useUserStore } from '../../store/useUserStore';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TaskBreaker'>;
};

const QUICK_TASKS = [
  { emoji: '🛏️', label: 'Petaa sänky', category: 'SIIVOUS' },
  { emoji: '🧹', label: 'Siivoa huone', category: 'SIIVOUS' },
  { emoji: '📚', label: 'Tee läksyt', category: 'OPISKELU' },
  { emoji: '🎒', label: 'Pakkaa koulureppu', category: 'JÄRJESTYS' },
  { emoji: '🦷', label: 'Pese hampaat', category: 'HYGIENIA' },
  { emoji: '🍽️', label: 'Siisti ruokapöytä', category: 'RUOKA' },
];

export default function TaskBreakerScreen({ navigation }: Props) {
  const [input, setInput] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoutine, setLoadingRoutine] = useState(false);
  const [confirmedTitle, setConfirmedTitle] = useState('');
  const { addTask } = useTaskStore();
  const { speechEnabled } = useUserStore();
  const { speak, isAvailable } = useSpeechAssistant(speechEnabled);

  const handleVoiceCommand = (command: string) => {
    if (command.includes('luo päivän rutiini') || command.includes('päivärutiini')) {
      handleGenerateDailyRoutine();
      return;
    }

    if ((command.includes('lisää tehtävä') || command.includes('vahvista')) && steps.length > 0) {
      handleConfirm();
      return;
    }

    const quickTask = QUICK_TASKS.find(task => command.includes(task.label.toLowerCase()));
    if (quickTask) {
      handleQuickPick(quickTask.label);
      return;
    }

    const explicitTask = command.match(/(?:pilko tehtävä|tehtävä)\s+(.+)/);
    const spokenTask = explicitTask?.[1]?.trim() ?? command.trim();

    if (spokenTask) {
      setInput(spokenTask);
      runBreaker(spokenTask);
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

  const runBreaker = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    setConfirmedTitle(trimmed);
    setSteps([]);
    setLoading(true);
    try {
      const result = await breakTaskWithAI(trimmed);
      setSteps(result);
      if (result[0]) {
        speak(`Selvä. Pilkoin tehtävän. Ensimmäinen askel: ${result[0].description}`);
      }
    } catch {
      const fallback = generateFallbackSteps(trimmed);
      setSteps(fallback);
      if (fallback[0]) {
        speak(`Tehdään näin. Ensimmäinen askel: ${fallback[0].description}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPick = (label: string) => {
    setInput(label);
    runBreaker(label);
  };

  const handleConfirm = () => {
    if (!steps.length) {
      return;
    }
    const task: Task = {
      id: `task-${Date.now()}`,
      title: confirmedTitle,
      status: 'idle',
      steps,
      totalXP: steps.reduce((acc, s) => acc + s.xpReward, 0),
      totalCoins: steps.reduce((acc, s) => acc + s.coinReward, 0),
      createdAt: new Date().toISOString(),
    };
    const addResult = addTask(task);
    if (!addResult.ok) {
      if (addResult.reason === 'duplicate-time') {
        Alert.alert('Duplikaatti', 'Samaa tehtävää ei voi lisätä samaan kellonaikaan samalle päivälle.');
      } else if (addResult.reason === 'brushing-time-restricted') {
        Alert.alert('Aikarajoitus', 'Hammaspesu voidaan ajastaa vain aamuun (05:00-10:59) tai iltaan (18:00-22:59).');
      }
      return;
    }

    navigation.navigate('Home');
  };

  const handleGenerateDailyRoutine = async () => {
    // Prevent simultaneous calls (user double-clicks button)
    if (loadingRoutine) {
      return;
    }
    
    setLoadingRoutine(true);

    try {
      const routine = await generateDailyRoutineWithAI();
      const createdAt = new Date().toISOString();

      // Add small delay to ensure tasks don't add in exact same millisecond
      for (let i = routine.length - 1; i >= 0; i -= 1) {
        const item = routine[i];
        const stepsForTask = generateFallbackSteps(item.title);

        const task: Task = {
          id: `routine-${Date.now()}-${i}`,
          title: `${item.time} - ${item.title}`,
          status: 'idle',
          steps: stepsForTask,
          totalXP: stepsForTask.reduce((acc, s) => acc + s.xpReward, 0),
          totalCoins: stepsForTask.reduce((acc, s) => acc + s.coinReward, 0),
          createdAt,
        };

        const addResult = addTask(task);
        if (!addResult.ok) {
          // Skip invalid routine items and continue adding the rest.
          continue;
        }
      }

      if (routine.length > 0) {
        const first = routine[0];
        const last = routine[routine.length - 1];
        speak(`Päivärutiini valmis. Aloitus ${first.time} ${first.title}. Viimeinen tehtävä ${last.time} ${last.title}.`);
      }

      navigation.navigate('Home');
    } catch {
      Alert.alert('Virhe', 'Päivärutiinin luonti epäonnistui. Yritä uudelleen.');
    } finally {
      setLoadingRoutine(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back + title */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Takaisin</Text>
          </TouchableOpacity>
          <Text style={styles.title}>✨ Tehtäväpilkkoja</Text>
        </View>

        <Text style={styles.subtitle}>
          Kerro tehtäväsi, niin AI tekee siitä pieniä, helppoja askelia! 🤖
        </Text>

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Esim. Siivoa huone..."
            placeholderTextColor={COLORS.textDisabled}
            returnKeyType="go"
            onSubmitEditing={() => runBreaker(input)}
          />
          <TouchableOpacity
            style={[styles.goBtn, (!input.trim() || loading) && styles.goBtnDisabled]}
            onPress={() => runBreaker(input)}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.goIcon}>🚀</Text>
          </TouchableOpacity>
        </View>

        {/* Quick picks */}
        <Text style={styles.quickLabel}>Tai valitse pikatehtävä:</Text>
        <View style={styles.quickGrid}>
          {QUICK_TASKS.map((task) => (
            <TouchableOpacity
              key={task.label}
              style={styles.quickCard}
              onPress={() => handleQuickPick(task.label)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickEmoji}>{task.emoji}</Text>
              <Text style={styles.quickCategory}>{task.category}</Text>
              <Text style={styles.quickLabel2}>{task.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.routineBtn, loadingRoutine && styles.goBtnDisabled]}
          onPress={handleGenerateDailyRoutine}
          disabled={loadingRoutine}
          activeOpacity={0.85}
        >
          <Text style={styles.routineBtnText}>
            {loadingRoutine ? 'Luodaan rutiinia...' : '🕒 Luo päivän rutiinit (Ollama)'}
          </Text>
        </TouchableOpacity>

        <View style={styles.voiceBox}>
          <TouchableOpacity
            style={[styles.voiceBtn, (!voiceAvailable || isListening) && styles.listenBtnDisabled]}
            onPress={isListening ? stopListening : startListening}
            disabled={!voiceAvailable}
            activeOpacity={0.85}
          >
            <Text style={styles.voiceBtnText}>{isListening ? '🎙️ Kuunnellaan...' : '🎤 Sano tehtävä ääneen'}</Text>
          </TouchableOpacity>
          <Text style={styles.audioHint}>Komennot: “siivoa huone”, “luo päivän rutiini”, “lisää tehtävä”.</Text>
          {!!transcript && <Text style={styles.voiceTranscript}>Kuulin: {transcript}</Text>}
          {!!voiceError && <Text style={styles.voiceError}>{voiceError}</Text>}
        </View>

        {!loading && steps.length > 0 && (
          <TouchableOpacity
            style={[styles.listenBtn, !isAvailable && styles.listenBtnDisabled]}
            onPress={() => speak(`Tehtävä ${confirmedTitle}. ${steps.map(s => s.description).join(', ')}`)}
            activeOpacity={0.85}
            disabled={!isAvailable}
          >
            <Text style={styles.listenBtnText}>🔊 Kuuntele askeleet</Text>
          </TouchableOpacity>
        )}

        {!isAvailable && (
          <Text style={styles.audioHint}>
            ⚠️ Puheentunnistus ei ole käytössä. Ratkaisut:
            1. npm run android (Android native build)
            2. npm run ios (iOS build)
            3. Varmista @react-native-voice/voice asennus
          </Text>
        )}

        {/* Loading */}
        {(loading || loadingRoutine) && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {loadingRoutine ? 'Ollama järjestää päivän tehtäviä... 🧠' : 'AI pilkkoo tehtävää... 🧠'}
            </Text>
          </View>
        )}

        {/* Steps preview */}
        {!loading && steps.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>
              📋 Askelet: <Text style={{ color: COLORS.xp }}>{confirmedTitle}</Text>
            </Text>

            {steps.map((step) => (
              <View key={step.id} style={styles.stepRow}>
                <Text style={styles.stepNum}>{step.order}.</Text>
                <Text style={styles.stepEmoji}>{step.emoji}</Text>
                <Text style={styles.stepDesc}>{step.description}</Text>
                <Text style={styles.stepReward}>+{step.xpReward} XP</Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalText}>
                Yhteensä: +{steps.reduce((a, s) => a + s.xpReward, 0)} XP  
                🪙 {steps.reduce((a, s) => a + s.coinReward, 0)} kolikkoa
              </Text>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>✅ Lisää tehtävälista!</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    marginBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { color: COLORS.xp, fontSize: FONT.md },
  title: { color: COLORS.text, fontSize: FONT.xl, fontWeight: '800' },

  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONT.md,
    lineHeight: 22,
    marginBottom: 20,
  },

  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 16,
    color: COLORS.text,
    fontSize: FONT.md,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  goBtn: {
    backgroundColor: COLORS.primary,
    width: 58,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goBtnDisabled: { opacity: 0.45 },
  goIcon: { fontSize: 26 },

  routineBtn: {
    backgroundColor: COLORS.xp,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  routineBtnText: {
    color: '#fff',
    fontSize: FONT.md,
    fontWeight: '800',
  },

  listenBtn: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  listenBtnDisabled: {
    opacity: 0.45,
  },
  listenBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  audioHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 14,
  },
  voiceBox: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 14,
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

  quickLabel: { color: COLORS.textMuted, fontSize: 13, marginBottom: 12 },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  quickCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickEmoji: { fontSize: 44 },
  quickCategory: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  quickLabel2: { color: COLORS.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },

  loadingBox: { alignItems: 'center', paddingVertical: 36 },
  loadingText: { color: COLORS.textMuted, fontSize: FONT.md, marginTop: 12 },

  previewSection: {},
  previewTitle: {
    color: COLORS.text,
    fontSize: FONT.lg,
    fontWeight: '700',
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  stepNum: { color: COLORS.xp, fontSize: 16, fontWeight: '800', width: 22 },
  stepEmoji: { fontSize: 24 },
  stepDesc: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '600' },
  stepReward: { color: COLORS.xp, fontSize: 12, fontWeight: '700' },
  totalRow: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalText: { color: COLORS.coin, fontSize: 15, fontWeight: '700' },
  confirmBtn: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmBtnText: { color: '#fff', fontSize: FONT.lg, fontWeight: '800' },
});

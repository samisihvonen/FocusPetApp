import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Vibration,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useUserStore } from '../../store/useUserStore';
import { useTaskStore } from '../../store/useTaskStore';
import { COLORS, RADIUS, FONT } from '../../constants/theme';
import { HomeArrivalRule, WeekdayKey } from '../../types';
import {
  buildTodayRoutines,
  buildGeneratedTask,
} from '../../services/scheduleParser';
import { fetchWilmaScheduleForToday, fetchHobbyEventsForToday } from '../../services/wilmaSyncParser';
import { fetchWilmaMessages, WilmaMessage } from '../../services/wilmaMessagesClient';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Admin'>;
};

const PIN_LENGTH = 4;
const DAY_ORDER: WeekdayKey[] = ['ma', 'ti', 'ke', 'to', 'pe'];
const DAY_LABELS: Record<WeekdayKey, string> = {
  ma: 'Maanantai',
  ti: 'Tiistai',
  ke: 'Keskiviikko',
  to: 'Torstai',
  pe: 'Perjantai',
};

// Numpad layout: rows [1-3], [4-6], [7-9], [empty, 0, ⌫]
const NUMPAD_KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function AdminScreen({ navigation }: Props) {
  const {
    adminPin,
    setAdminPin,
    username,
    setUsername,
    xp,
    level,
    coins,
    streakDays,
    wilmaUrl,
    setWilmaUrl,
    hobbyUrl,
    setHobbyUrl,
    wilmaUsername,
    setWilmaUsername,
    wilmaPassword,
    setWilmaPassword,
    homeArrivalRules,
    setHomeArrivalRules,
  } = useUserStore();
  const { tasks, resetDailyRoutines, ensureDailyRoutines, addTask } = useTaskStore();

  // ── Auth state ────────────────────────────────────────────
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // ── Admin panel state ─────────────────────────────────────
  const [nameInput, setNameInput] = useState(username);
  const [editingName, setEditingName] = useState(false);
  // PIN change: step 0=idle, 1=enter current, 2=enter new, 3=confirm new
  const [pinChangeStep, setPinChangeStep] = useState<0|1|2|3>(0);
  const [pinChangeBuffer, setPinChangeBuffer] = useState('');
  const [newPinTemp, setNewPinTemp] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState('');
  const [pinChangeMsgOk, setPinChangeMsgOk] = useState(false);

  // ── Home arrival schedule state ─────────────────────────
  const [homeArrivalInputs, setHomeArrivalInputs] = useState<HomeArrivalRule[]>(homeArrivalRules);

  // ── Wilma sync state ──────────────────────────────────────
  const [wilmaUrlInput, setWilmaUrlInput] = useState(wilmaUrl);
  const [wilmaSyncState, setWilmaSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [wilmaSyncMessage, setWilmaSyncMessage] = useState('');

  // ── Hobby sync state ──────────────────────────────────────
  const [hobbyUrlInput, setHobbyUrlInput] = useState(hobbyUrl);
  const [hobbySyncState, setHobbySyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [hobbySyncMessage, setHobbySyncMessage] = useState('');

  // ── Wilma messages state ─────────────────────────────────
  const [wilmaUsernameInput, setWilmaUsernameInput] = useState(wilmaUsername);
  const [wilmaPasswordInput, setWilmaPasswordInput] = useState(wilmaPassword);
  const [wilmaPasswordVisible, setWilmaPasswordVisible] = useState(false);
  const [wmsgState, setWmsgState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [wmsgError, setWmsgError] = useState('');
  const [wilmaMessages, setWilmaMessages] = useState<WilmaMessage[]>([]);

  const completedToday = tasks.filter(t => t.status === 'completed').length;
  const pendingCount = tasks.filter(t => t.status !== 'completed').length;

  // ── PIN handling ──────────────────────────────────────────
  const handlePinKey = (key: string) => {
    if (key === '⌫') {
      setPinInput(p => p.slice(0, -1));
      setPinError(false);
      return;
    }
    if (key === '' || pinInput.length >= PIN_LENGTH) { return; }

    const next = pinInput + key;
    setPinInput(next);
    setPinError(false);

    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        if (next === adminPin) {
          setUnlocked(true);
          setPinInput('');
        } else {
          setPinError(true);
          Vibration.vibrate([0, 80, 50, 80]);
          setTimeout(() => setPinInput(''), 500);
        }
      }, 120);
    }
  };

  // ── Admin actions ─────────────────────────────────────────
  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length < 1) { return; }
    setUsername(trimmed);
    setEditingName(false);
  };

  const handlePinChangeKey = (key: string) => {
    if (pinChangeStep === 0) { return; }
    if (key === '⌫') {
      setPinChangeBuffer(p => p.slice(0, -1));
      setPinChangeMsg('');
      return;
    }
    if (key === '' || pinChangeBuffer.length >= PIN_LENGTH) { return; }
    const next = pinChangeBuffer + key;
    setPinChangeBuffer(next);
    setPinChangeMsg('');
    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        if (pinChangeStep === 1) {
          if (next === adminPin) {
            setPinChangeStep(2);
            setPinChangeBuffer('');
          } else {
            setPinChangeMsg('Väärä nykyinen PIN.');
            Vibration.vibrate([0, 80, 50, 80]);
            setTimeout(() => setPinChangeBuffer(''), 400);
          }
        } else if (pinChangeStep === 2) {
          setNewPinTemp(next);
          setPinChangeStep(3);
          setPinChangeBuffer('');
        } else if (pinChangeStep === 3) {
          if (next === newPinTemp) {
            setAdminPin(next);
            setPinChangeStep(0);
            setPinChangeBuffer('');
            setNewPinTemp('');
            setPinChangeMsg('✅ PIN vaihdettu!');
            setPinChangeMsgOk(true);
          } else {
            setPinChangeMsg('PIN-koodit eivät täsmää.');
            Vibration.vibrate([0, 80, 50, 80]);
            setTimeout(() => {
              setPinChangeBuffer('');
              setPinChangeStep(2);
              setNewPinTemp('');
            }, 400);
          }
        }
      }, 120);
    }
  };

  const handleResetRoutines = () => {
    Alert.alert(
      'Nollaa rutiinit',
      'Poistaa tämän päivän rutiinit ja luo ne uudelleen oletusarvoilla. Jatketaanko?',
      [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Nollaa',
          style: 'destructive',
          onPress: () => {
            resetDailyRoutines();
            ensureDailyRoutines();
            Alert.alert('Valmis', 'Rutiinit on nollattu ja luotu uudelleen.');
          },
        },
      ],
    );
  };

  const validateTime = (value: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

  const handleHomeArrivalChange = (
    day: WeekdayKey,
    field: keyof Omit<HomeArrivalRule, 'day'>,
    value: string,
  ) => {
    setHomeArrivalInputs(prev =>
      prev.map(rule =>
        rule.day === day ? { ...rule, [field]: value } : rule,
      ),
    );
  };

  const handleSaveHomeArrivals = () => {
    const normalized = DAY_ORDER.map(day => {
      const found = homeArrivalInputs.find(rule => rule.day === day);
      return found ?? { day, sourceLabel: '', arrivalStart: '', arrivalEnd: '' };
    });

    for (const row of normalized) {
      const source = row.sourceLabel.trim();
      if (!source) {
        Alert.alert('Puuttuva tieto', `${DAY_LABELS[row.day]}: lisää lähde (esim. koulu, iltis).`);
        return;
      }
      if (!validateTime(row.arrivalStart) || !validateTime(row.arrivalEnd)) {
        Alert.alert('Virheellinen aika', `${DAY_LABELS[row.day]}: käytä muotoa HH:MM (esim. 14:20).`);
        return;
      }
      if (row.arrivalStart > row.arrivalEnd) {
        Alert.alert('Virheellinen aikaikkuna', `${DAY_LABELS[row.day]}: aloitus ei voi olla lopun jälkeen.`);
        return;
      }
    }

    setHomeArrivalRules(normalized);
    setHomeArrivalInputs(normalized);
    Alert.alert('Tallennettu', 'Kotiintuloajat päivitetty. Wilma-synkka käyttää uusia aikoja.');
  };

  const handleSaveWilmaUrl = () => {
    setWilmaUrl(wilmaUrlInput.trim());
  };

  const handleWilmaSync = async () => {
    const url = wilmaUrlInput.trim();
    if (!url) {
      Alert.alert('URL puuttuu', 'Anna Wilma ICS-kalenteri-URL ensin.');
      return;
    }
    setWilmaSyncState('syncing');
    setWilmaSyncMessage('');
    try {
      setWilmaUrl(url);
      const result = await fetchWilmaScheduleForToday(url);
      if (!result) {
        setWilmaSyncState('done');
        setWilmaSyncMessage('📅 Tänään ei koulua — rutiinit pysyvät oletuksina.');
        return;
      }
      const dayNames = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'];
      const todayKey = dayNames[new Date().getDay()];
      const routineItems = buildTodayRoutines([
        { day: todayKey, schoolStart: result.schoolStart, schoolEnd: result.schoolEnd },
      ], homeArrivalRules);
      resetDailyRoutines();
      routineItems.forEach(item => addTask(buildGeneratedTask(item)));
      setWilmaSyncState('done');
      setWilmaSyncMessage(
        `✅ Koulu ${result.schoolStart}–${result.schoolEnd} → ${routineItems.length} rutiinia luotu!`,
      );
    } catch {
      setWilmaSyncState('error');
      setWilmaSyncMessage('Haku epäonnistui. Tarkista URL ja internet-yhteys.');
    }
  };

  const handleSaveHobbyUrl = () => {
    setHobbyUrl(hobbyUrlInput.trim());
  };

  const handleHobbySync = async () => {
    const url = hobbyUrlInput.trim();
    if (!url) {
      Alert.alert('URL puuttuu', 'Anna MyClub ICS-kalenteri-URL ensin.');
      return;
    }
    setHobbySyncState('syncing');
    setHobbySyncMessage('');
    try {
      setHobbyUrl(url);
      const events = await fetchHobbyEventsForToday(url);
      if (events.length === 0) {
        setHobbySyncState('done');
        setHobbySyncMessage('📅 Tänään ei harrastusta.');
        return;
      }
      // Add a prep task 30 min before + the event itself for each hobby event
      const addMinutes = (t: string, min: number) => {
        const [h, m] = t.split(':').map(Number);
        const total = h * 60 + m + min;
        const hh = Math.floor(total / 60) % 24;
        const mm = total % 60;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      };
      events.forEach(ev => {
        addTask(buildGeneratedTask({
          time: addMinutes(ev.start, -30),
          title: `Valmistaudu — ${ev.title}`,
        }));
        addTask(buildGeneratedTask({ time: ev.start, title: `🏒 ${ev.title}`, blockUntil: ev.end }));
        addTask(buildGeneratedTask({ time: ev.end, title: '🏠 Kotiin harrastuksesta' }));
      });
      setHobbySyncState('done');
      setHobbySyncMessage(
        `✅ ${events.length} harrastus lisätty: ${events.map(e => e.start).join(', ')}`,
      );
    } catch {
      setHobbySyncState('error');
      setHobbySyncMessage('Haku epäonnistui. Tarkista URL ja internet-yhteys.');
    }
  };

  const handleFetchWilmaMessages = async () => {
    const url = wilmaUrl || wilmaUrlInput;
    const uname = wilmaUsernameInput.trim();
    const pwd = wilmaPasswordInput;
    if (!url) {
      Alert.alert('URL puuttuu', 'Anna Wilma ICS-URL tai tenant-URL ensin.');
      return;
    }
    if (!uname || !pwd) {
      Alert.alert('Tunnukset puuttuvat', 'Anna Wilma-käyttäjätunnus ja salasana.');
      return;
    }
    setWilmaUsername(uname);
    setWilmaPassword(pwd);
    setWmsgState('loading');
    setWmsgError('');
    setWilmaMessages([]);
    try {
      const msgs = await fetchWilmaMessages(url, uname, pwd);
      setWilmaMessages(msgs);
      setWmsgState('done');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Tuntematon virhe';
      setWmsgError(msg);
      setWmsgState('error');
    }
  };



  // ══════════════════════════════════════════════════════════
  // PIN gate
  // ══════════════════════════════════════════════════════════
  if (!unlocked) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.pinScreen}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Takaisin</Text>
          </TouchableOpacity>

          <Text style={styles.pinTitle}>🔐 Vanhemman paneeli</Text>
          <Text style={styles.pinSubtitle}>Syötä PIN-koodi</Text>

          {/* PIN dots */}
          <View style={styles.pinDots}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  i < pinInput.length && styles.pinDotFilled,
                  pinError && styles.pinDotError,
                ]}
              />
            ))}
          </View>

          {pinError && <Text style={styles.pinErrorText}>Väärä PIN-koodi</Text>}

          {/* Numpad */}
          <View style={styles.numpad}>
            {NUMPAD_KEYS.map((key, idx) =>
              key === '' ? (
                <View key={idx} style={styles.numpadSpacer} />
              ) : (
                <TouchableOpacity
                  key={idx}
                  style={[styles.numpadKey, key === '⌫' && styles.numpadDelete]}
                  onPress={() => handlePinKey(key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.numpadKeyText}>{key}</Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════════════════════
  // Admin panel
  // ══════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.adminContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Header */}
        <View style={styles.adminHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Takaisin</Text>
          </TouchableOpacity>
          <Text style={styles.adminTitle}>⚙️ Admin</Text>
          <TouchableOpacity style={styles.lockBtn} onPress={() => setUnlocked(false)}>
            <Text style={styles.lockBtnText}>🔒</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tilastot ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 {username}n tilastot</Text>
          <View style={styles.statsGrid}>
            <StatChip label="Taso" value={String(level)} />
            <StatChip label="XP" value={String(xp)} />
            <StatChip label="Kolikot" value={String(coins)} />
            <StatChip label="Putki" value={`${streakDays} pv`} />
            <StatChip label="Tehty" value={String(completedToday)} />
            <StatChip label="Kesken" value={String(pendingCount)} />
          </View>
        </View>

        {/* ── Lapsen nimi ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Lapsen nimi</Text>
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                maxLength={20}
                placeholder="Lapsen nimi"
                placeholderTextColor={COLORS.textMuted}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName}>
                <Text style={styles.saveBtnText}>Tallenna</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.rowBtn}
              onPress={() => { setNameInput(username); setEditingName(true); }}
            >
              <Text style={styles.rowBtnLabel}>{username}</Text>
              <Text style={styles.rowBtnAction}>Muuta ✏️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Tehtävät ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Tehtävät</Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('TaskBreaker')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>✨ Avaa Tehtäväpilkkoja</Text>
          </TouchableOpacity>
        </View>

        {/* ── Rutiinit ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕒 Rutiinit</Text>
          <Text style={styles.hintText}>
            Nollaa päivän rutiinit jos ne ovat menneet sekaisin tai haluat päivittää sisällön.
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleResetRoutines}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>🔄 Nollaa tämän päivän rutiinit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Kotiintuloajat ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏠 Kotiintuloajat (ma-pe)</Text>
          <Text style={styles.hintText}>
            Aseta arvioitu kotiintuloikkuna viikonpaivittain.{"\n"}
            Tallennettu aika vaikuttaa Wilma-synkan luomaan kotiintulorutiiniin.
          </Text>
          {DAY_ORDER.map(day => {
            const row = homeArrivalInputs.find(rule => rule.day === day);
            if (!row) {
              return null;
            }

            return (
              <View key={day} style={styles.arrivalRow}>
                <Text style={styles.arrivalDayLabel}>{DAY_LABELS[day]}</Text>
                <TextInput
                  style={styles.input}
                  value={row.sourceLabel}
                  onChangeText={text => handleHomeArrivalChange(day, 'sourceLabel', text)}
                  placeholder="Lahde (koulu, iltis, kerho...)"
                  placeholderTextColor={COLORS.textMuted}
                />
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    value={row.arrivalStart}
                    onChangeText={text => handleHomeArrivalChange(day, 'arrivalStart', text)}
                    placeholder="14:20"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <Text style={styles.timeSeparator}>-</Text>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    value={row.arrivalEnd}
                    onChangeText={text => handleHomeArrivalChange(day, 'arrivalEnd', text)}
                    placeholder="14:45"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>
            );
          })}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleSaveHomeArrivals}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>💾 Tallenna kotiintuloajat</Text>
          </TouchableOpacity>
        </View>

        {/* ── Wilma-kalenteri ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎓 Wilma-kalenteri</Text>
          <Text style={styles.hintText}>
            Kopioi Wilma → Kalenteri → "Vie kalenteriin" -linkki.{'\n'}
            Rutiinit luodaan automaattisesti koulupäivän mukaan.
          </Text>
          <TextInput
            style={[styles.input, styles.inputSmall]}
            value={wilmaUrlInput}
            onChangeText={setWilmaUrlInput}
            placeholder="https://espoo.inschool.fi/schedule/export/..."
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <View style={styles.editRow}>
            <TouchableOpacity
              style={[styles.saveBtn, { flex: 1 }]}
              onPress={handleSaveWilmaUrl}
            >
              <Text style={styles.saveBtnText}>💾 Tallenna URL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { flex: 1 },
                wilmaSyncState === 'syncing' && styles.actionBtnDisabled,
              ]}
              onPress={handleWilmaSync}
              disabled={wilmaSyncState === 'syncing'}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>
                {wilmaSyncState === 'syncing' ? '⏳ Haetaan...' : '🔄 Synkronoi tänään'}
              </Text>
            </TouchableOpacity>
          </View>
          {wilmaSyncMessage !== '' && (
            <Text
              style={[
                styles.hintText,
                wilmaSyncState === 'error' ? styles.scanError : styles.scanSuccess,
              ]}
            >
              {wilmaSyncMessage}
            </Text>
          )}
        </View>

        {/* ── MyClub-harrastuskalenteri ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏒 Harrastuskalenteri</Text>
          <Text style={styles.hintText}>
            MyClub: kopioi kalenteri-linkki (webcal:// tai https://).{'\n'}
            Lisää harjoitukset tämän päivän tehtäviin.
          </Text>
          <TextInput
            style={[styles.input, styles.inputSmall]}
            value={hobbyUrlInput}
            onChangeText={setHobbyUrlInput}
            placeholder="https://id.myclub.fi/flow/calendar_subscriptions/..."
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <View style={styles.editRow}>
            <TouchableOpacity
              style={[styles.saveBtn, { flex: 1 }]}
              onPress={handleSaveHobbyUrl}
            >
              <Text style={styles.saveBtnText}>💾 Tallenna URL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { flex: 1 },
                hobbySyncState === 'syncing' && styles.actionBtnDisabled,
              ]}
              onPress={handleHobbySync}
              disabled={hobbySyncState === 'syncing'}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>
                {hobbySyncState === 'syncing' ? '⏳ Haetaan...' : '🔄 Lisää harjoitukset'}
              </Text>
            </TouchableOpacity>
          </View>
          {hobbySyncMessage !== '' && (
            <Text
              style={[
                styles.hintText,
                hobbySyncState === 'error' ? styles.scanError : styles.scanSuccess,
              ]}
            >
              {hobbySyncMessage}
            </Text>
          )}
        </View>

        {/* ── Wilma-viestit ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📬 Wilma-viestit</Text>
          <Text style={styles.hintText}>
            Kirjaudu Wilmaan hakemaan saapuneet viestit.{'\n'}
            Tenant-URL saadaan automaattisesti Wilma ICS-linkistä.{'\n'}
            ⚠️ Salasana tallennetaan laitteelle selkokielisenä.
          </Text>
          <TextInput
            style={[styles.input, styles.inputSmall]}
            value={wilmaUsernameInput}
            onChangeText={setWilmaUsernameInput}
            placeholder="käyttäjätunnus@koulu.fi"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <View style={styles.editRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={wilmaPasswordInput}
              onChangeText={setWilmaPasswordInput}
              placeholder="Salasana"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!wilmaPasswordVisible}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setWilmaPasswordVisible(v => !v)}
            >
              <Text style={styles.eyeBtnText}>{wilmaPasswordVisible ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, wmsgState === 'loading' && styles.actionBtnDisabled]}
            onPress={handleFetchWilmaMessages}
            disabled={wmsgState === 'loading'}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>
              {wmsgState === 'loading' ? '⏳ Haetaan viestejä...' : '📥 Hae Wilma-viestit'}
            </Text>
          </TouchableOpacity>
          {wmsgState === 'error' && wmsgError !== '' && (
            <Text style={[styles.hintText, styles.scanError]}>{wmsgError}</Text>
          )}
          {wmsgState === 'done' && wilmaMessages.length === 0 && (
            <Text style={[styles.hintText, styles.scanSuccess]}>✅ Ei viestejä löytynyt (inbox + arkisto + lähetetyt).</Text>
          )}
          {wilmaMessages.map(msg => (
            <View key={`${msg.folder}-${msg.wilmaId}`} style={styles.wmsgRow}>
              <View style={styles.wmsgHeader}>
                <View style={[styles.wmsgUnreadDot, msg.isRead && styles.wmsgUnreadDotRead]} />
                <Text
                  style={[styles.wmsgSubject, !msg.isRead && styles.wmsgSubjectUnread]}
                  numberOfLines={2}
                >
                  [{msg.folder}] {msg.subject}
                </Text>
              </View>
              {(msg.senderName || msg.sentAt) ? (
                <Text style={styles.wmsgMeta}>
                  {[msg.senderName, msg.sentAt].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* ── Vaihda PIN ──── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Vaihda PIN-koodi</Text>
          {pinChangeStep === 0 ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setPinChangeStep(1); setPinChangeBuffer(''); setPinChangeMsg(''); setPinChangeMsgOk(false); }}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>🔑 Aseta uusi PIN</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.pinChangeBox}>
              <Text style={styles.pinChangeLabel}>
                {pinChangeStep === 1 ? 'Syötä nykyinen PIN' : pinChangeStep === 2 ? 'Syötä uusi PIN' : 'Vahvista uusi PIN'}
              </Text>
              <View style={styles.pinDots}>
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.pinDot,
                      i < pinChangeBuffer.length && styles.pinDotFilled,
                    ]}
                  />
                ))}
              </View>
              {pinChangeMsg !== '' && (
                <Text style={[styles.pinMsg, pinChangeMsgOk && styles.pinMsgOk]}>{pinChangeMsg}</Text>
              )}
              <View style={styles.numpad}>
                {NUMPAD_KEYS.map((key, idx) =>
                  key === '' ? (
                    <View key={idx} style={styles.numpadSpacer} />
                  ) : (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.numpadKey, key === '⌫' && styles.numpadDelete]}
                      onPress={() => handlePinChangeKey(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.numpadKeyText}>{key}</Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
              <TouchableOpacity
                onPress={() => { setPinChangeStep(0); setPinChangeBuffer(''); setNewPinTemp(''); setPinChangeMsg(''); }}
              >
                <Text style={styles.pinChangeCancelText}>Peruuta</Text>
              </TouchableOpacity>
            </View>
          )}
          {pinChangeStep === 0 && pinChangeMsg !== '' && (
            <Text style={[styles.pinMsg, pinChangeMsgOk && styles.pinMsgOk]}>{pinChangeMsg}</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipValue}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  // ── PIN gate ──────────────────────────────────────────────
  pinScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pinTitle: {
    color: COLORS.text,
    fontSize: FONT.xxl,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  pinSubtitle: {
    color: COLORS.textMuted,
    fontSize: FONT.md,
    marginBottom: 36,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 12,
  },
  pinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pinDotError: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  pinErrorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 216,
    gap: 12,
    marginTop: 28,
    justifyContent: 'center',
  },
  numpadKey: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadDelete: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: COLORS.danger,
  },
  numpadSpacer: {
    width: 64,
    height: 64,
  },
  numpadKeyText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },

  // ── Admin panel ───────────────────────────────────────────
  adminContent: { paddingBottom: 120 },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  adminTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  lockBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBtnText: { fontSize: 20 },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backBtnText: {
    color: COLORS.xp,
    fontSize: 14,
    fontWeight: '700',
  },

  section: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT.lg,
    fontWeight: '800',
    marginBottom: 2,
  },
  hintText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statChip: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 72,
  },
  statChipValue: {
    color: COLORS.xp,
    fontSize: 18,
    fontWeight: '900',
  },
  statChipLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  editRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  inputSmall: {
    fontSize: 11,
    fontWeight: '400',
    minHeight: 56,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  rowBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBtnLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  rowBtnAction: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnDanger: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  pinMsg: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  pinMsgOk: {
    color: COLORS.success,
  },
  pinChangeBox: {
    alignItems: 'center',
    gap: 12,
  },
  pinChangeLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  pinChangeCancelText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  scanError: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  scanSuccess: {
    color: COLORS.success,
    fontWeight: '700',
  },
  wmsgRow: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  wmsgHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  wmsgUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    flexShrink: 0,
  },
  wmsgUnreadDotRead: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  wmsgSubject: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  wmsgSubjectUnread: {
    color: COLORS.text,
    fontWeight: '800',
  },
  wmsgMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginLeft: 16,
  },
  eyeBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.bgDeep,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eyeBtnText: {
    fontSize: 18,
  },
  arrivalRow: {
    gap: 8,
    backgroundColor: COLORS.bgDeep,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 10,
  },
  arrivalDayLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  timeInput: {
    flex: 1,
    textAlign: 'center',
  },
  timeSeparator: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
});

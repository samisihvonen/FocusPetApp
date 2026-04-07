import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Sound from 'react-native-sound';
import { COLORS, FONT, RADIUS } from '../../constants/theme';

const BRUSH_DURATION_SECONDS = 120;
const CLOCK_MARKERS = 24;
const BRUSHING_ZONES = [
  'Ylaetuhampaat',
  'Oikea puoli',
  'Alaetuhampaat',
  'Vasen puoli',
] as const;

type Props = {
  onComplete?: () => void;
  onZoneChange?: (zone: string, secondsPerZone: number) => void;
  autoStartToken?: number;
};

export default function BrushingTimer({ onComplete, onZoneChange, autoStartToken }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(BRUSH_DURATION_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [soundFailed, setSoundFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const soundRef = useRef<Sound | null>(null);
  const brushTilt = useRef(new Animated.Value(0)).current;
  const bubbleOne = useRef(new Animated.Value(0)).current;
  const bubbleTwo = useRef(new Animated.Value(0)).current;
  const bubbleThree = useRef(new Animated.Value(0)).current;

  const progress = useMemo(
    () => 1 - secondsLeft / BRUSH_DURATION_SECONDS,
    [secondsLeft],
  );
  const clockMarkers = useMemo(
    () =>
      Array.from({ length: CLOCK_MARKERS }, (_, index) => {
        const angle = (index / CLOCK_MARKERS) * Math.PI * 2 - Math.PI / 2;
        const radius = 58;

        return {
          key: `marker-${index}`,
          x: 70 + Math.cos(angle) * radius - 4,
          y: 70 + Math.sin(angle) * radius - 4,
        };
      }),
    [],
  );
  const filledMarkerCount = Math.round(progress * CLOCK_MARKERS);
  const zoneIndex = Math.min(
    BRUSHING_ZONES.length - 1,
    Math.floor((BRUSH_DURATION_SECONDS - secondsLeft) / 30),
  );
  const currentZone = BRUSHING_ZONES[zoneIndex];
  const announcedZoneRef = useRef<number | null>(null);

  useEffect(() => {
    Sound.setCategory('Playback');

    try {
      soundRef.current = new Sound('brush_relax.wav', Sound.MAIN_BUNDLE, error => {
        if (error) {
          setSoundFailed(true);
          return;
        }
        soundRef.current?.setNumberOfLoops(-1);
        soundRef.current?.setVolume(0.55);
        setSoundReady(true);
      });
    } catch {
      setSoundFailed(true);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      deadlineRef.current = null;
      soundRef.current?.stop();
      soundRef.current?.release();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    const tiltLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(brushTilt, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(brushTilt, { toValue: -1, duration: 900, useNativeDriver: true }),
        Animated.timing(brushTilt, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );

    const makeBubbleLoop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    const bubbleLoops = [
      makeBubbleLoop(bubbleOne, 0),
      makeBubbleLoop(bubbleTwo, 500),
      makeBubbleLoop(bubbleThree, 950),
    ];

    tiltLoop.start();
    bubbleLoops.forEach(loop => loop.start());

    return () => {
      tiltLoop.stop();
      bubbleLoops.forEach(loop => loop.stop());
    };
  }, [brushTilt, bubbleOne, bubbleTwo, bubbleThree]);

  useEffect(() => {
    if (!isRunning || isFinished) {
      return;
    }

    if (announcedZoneRef.current === zoneIndex) {
      return;
    }

    announcedZoneRef.current = zoneIndex;
    onZoneChange?.(currentZone, 30);
  }, [currentZone, isFinished, isRunning, onZoneChange, zoneIndex]);

  useEffect(() => {
    if (autoStartToken === undefined) {
      return;
    }

    if (isFinished) {
      setSecondsLeft(BRUSH_DURATION_SECONDS);
      setIsFinished(false);
      announcedZoneRef.current = null;
      deadlineRef.current = null;
    }

    if (!isRunning) {
      setIsRunning(true);
    }
  }, [autoStartToken, isFinished, isRunning]);

  useEffect(() => {
    const finishBrushing = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      deadlineRef.current = null;
      setIsRunning(false);
      setIsFinished(true);
      soundRef.current?.stop();
      onComplete?.();
    };

    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      deadlineRef.current = null;
      return;
    }

    if (deadlineRef.current === null) {
      deadlineRef.current = Date.now() + secondsLeft * 1000;
    }

    timerRef.current = setInterval(() => {
      const deadline = deadlineRef.current;
      if (deadline === null) {
        return;
      }

      const msLeft = deadline - Date.now();
      if (msLeft <= 0) {
        setSecondsLeft(0);
        finishBrushing();
        return;
      }

      const nextSeconds = Math.ceil(msLeft / 1000);
      setSecondsLeft(prev => (prev === nextSeconds ? prev : nextSeconds));
    }, 250);

    if (soundReady) {
      soundRef.current?.play(() => undefined);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, onComplete, secondsLeft, soundReady]);

  const toggleTimer = () => {
    if (isFinished) {
      setSecondsLeft(BRUSH_DURATION_SECONDS);
      setIsFinished(false);
      announcedZoneRef.current = null;
      deadlineRef.current = null;
    }

    if (isRunning) {
      setIsRunning(false);
      deadlineRef.current = null;
      soundRef.current?.pause();
      return;
    }

    setIsRunning(true);
  };

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>🪥 Rauhallinen harjaus</Text>
      <Text style={styles.title}>Harjataan hampaita 2 minuuttia</Text>
      <View style={styles.zonePill}>
        <Text style={styles.zonePillText}>Nyt: {currentZone}</Text>
      </View>
      <View style={styles.zoneRow}>
        {BRUSHING_ZONES.map((zone, index) => {
          const isActive = index === zoneIndex;
          const isPassed = index < zoneIndex || isFinished;

          return (
            <View
              key={zone}
              style={[
                styles.zoneDot,
                isActive && styles.zoneDotActive,
                isPassed && styles.zoneDotDone,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.animationStage}>
        <View style={styles.clockTrack}>
          {clockMarkers.map((marker, index) => (
            <View
              key={marker.key}
              style={[
                styles.clockDot,
                { left: marker.x, top: marker.y },
                index < filledMarkerCount && styles.clockDotActive,
              ]}
            />
          ))}
        </View>

        <Animated.View
          style={[
            styles.bubble,
            styles.bubbleOne,
            {
              opacity: bubbleOne.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.8] }),
              transform: [
                { translateY: bubbleOne.interpolate({ inputRange: [0, 1], outputRange: [18, -70] }) },
                { translateX: bubbleOne.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
                { scale: bubbleOne.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            styles.bubbleTwo,
            {
              opacity: bubbleTwo.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.75] }),
              transform: [
                { translateY: bubbleTwo.interpolate({ inputRange: [0, 1], outputRange: [18, -86] }) },
                { translateX: bubbleTwo.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) },
                { scale: bubbleTwo.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.05] }) },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            styles.bubbleThree,
            {
              opacity: bubbleThree.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.7] }),
              transform: [
                { translateY: bubbleThree.interpolate({ inputRange: [0, 1], outputRange: [18, -76] }) },
                { translateX: bubbleThree.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) },
                { scale: bubbleThree.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] }) },
              ],
            },
          ]}
        />

        <View style={styles.toothGlow} />
        <Text style={styles.tooth}>🦷</Text>
        <Animated.View
          style={[
            styles.brush,
            {
              transform: [
                {
                  rotate: brushTilt.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ['-16deg', '0deg', '16deg'],
                  }),
                },
                {
                  translateY: brushTilt.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [6, -2, 6],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.brushEmoji}>🪥</Text>
        </Animated.View>
      </View>

      <Text style={styles.timer}>{minutes}:{seconds}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` as const }]} />
      </View>

      <Text style={styles.helper}>
        {isFinished
          ? 'Valmista tuli. Suu on raikas ja puhdas.'
          : `${currentZone}. Pienet pyorat liikkeet ja rauhallinen tempo.`}
      </Text>

      <Text style={styles.musicStatus}>
        {soundFailed
          ? 'Musiikki ei ole saatavilla tassa buildissa, mutta animaatio toimii.'
          : soundReady
            ? 'Rauhoittava taustamusiikki on mukana.'
            : 'Ladataan rauhallista taustamusiikkia...'}
      </Text>

      <TouchableOpacity style={styles.button} onPress={toggleTimer} activeOpacity={0.85}>
        <Text style={styles.buttonText}>
          {isFinished ? '🔁 Aloita uudelleen' : isRunning ? '⏸️ Tauko' : '▶️ Aloita 2 min'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#18345E',
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: '#5DA7FF',
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
  },
  kicker: {
    color: '#BAE6FD',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#F8FAFC',
    fontSize: FONT.lg,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  zonePill: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  zonePillText: {
    color: '#E0F2FE',
    fontSize: 13,
    fontWeight: '800',
  },
  zoneRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  zoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  zoneDotActive: {
    backgroundColor: '#FDE68A',
    transform: [{ scale: 1.2 }],
  },
  zoneDotDone: {
    backgroundColor: '#7DD3FC',
  },
  animationStage: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 6,
    overflow: 'hidden',
  },
  toothGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  tooth: {
    fontSize: 86,
  },
  clockTrack: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  clockDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  clockDotActive: {
    backgroundColor: '#FDE68A',
    shadowColor: '#FDE68A',
    shadowOpacity: 0.6,
    shadowRadius: 5,
  },
  brush: {
    position: 'absolute',
    bottom: 18,
    right: 68,
  },
  brushEmoji: {
    fontSize: 68,
  },
  bubble: {
    position: 'absolute',
    bottom: 32,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  bubbleOne: { left: 92 },
  bubbleTwo: { right: 100, width: 14, height: 14, borderRadius: 7 },
  bubbleThree: { left: 138, width: 12, height: 12, borderRadius: 6 },
  timer: {
    color: '#F8FAFC',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
  },
  track: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 10,
  },
  fill: {
    height: 10,
    backgroundColor: '#7DD3FC',
    borderRadius: 999,
  },
  helper: {
    color: '#E0F2FE',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  musicStatus: {
    color: '#BFDBFE',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});

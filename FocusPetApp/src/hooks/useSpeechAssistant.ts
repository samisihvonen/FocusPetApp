import { useCallback, useEffect } from 'react';
import { NativeModules } from 'react-native';
import Tts from 'react-native-tts';

export function useSpeechAssistant(enabled: boolean) {
  const isTtsAvailable = !!NativeModules.TextToSpeech;

  useEffect(() => {
    if (!isTtsAvailable) {
      return;
    }

    try {
      Tts.setDefaultLanguage('fi-FI').catch(() => undefined);
      Tts.setDefaultRate(0.47);
      Tts.setDefaultPitch(1.0);
    } catch {
      return;
    }

    return () => {
      try {
        Tts.stop();
      } catch {
        // Native TTS module is unavailable in this build.
      }
    };
  }, [isTtsAvailable]);

  const speak = useCallback(
    (text: string, interrupt = true) => {
      if (!enabled || !text.trim() || !isTtsAvailable) {
        return;
      }

      try {
        if (interrupt) {
          Tts.stop();
        }
        Tts.speak(text);
      } catch {
        // Native TTS module is unavailable in this build.
      }
    },
    [enabled, isTtsAvailable],
  );

  const stop = useCallback(() => {
    if (!isTtsAvailable) {
      return;
    }

    try {
      Tts.stop();
    } catch {
      // Native TTS module is unavailable in this build.
    }
  }, [isTtsAvailable]);

  const announceDailyPlan = useCallback(
    (taskTitles: string[]) => {
      if (!taskTitles.length) {
        speak('Tallettuja tehtäviä ei ole vielä. Lisää ensimmäinen tehtäväsi.');
        return;
      }

      const compact = taskTitles.slice(0, 6).join(', ');
      speak(`Tämän päivän suunnitelma: ${compact}.`);
    },
    [speak],
  );

  return { speak, stop, announceDailyPlan, isAvailable: isTtsAvailable };
}

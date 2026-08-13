import { useCallback, useEffect, useMemo, useState } from 'react';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

type VoiceModuleShape = {
  start: (locale: string, options?: Record<string, unknown>) => Promise<void>;
  stop: () => Promise<void>;
  cancel: () => Promise<void>;
  destroy: () => Promise<void>;
  removeAllListeners: () => void;
  onSpeechResults?: ((event: { value?: string[] }) => void) | undefined;
  onSpeechError?:
    | ((event: { error?: { message?: string } }) => void)
    | undefined;
  onSpeechEnd?: (() => void) | undefined;
};

type UseVoiceCommandsOptions = {
  locale?: string;
  onCommand?: (command: string) => void;
};

function wait(ms: number) {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeObj = error as {
      message?: string;
      error?: { message?: string };
    };
    if (
      typeof maybeObj.message === 'string' &&
      maybeObj.message.trim().length > 0
    ) {
      return maybeObj.message;
    }
    if (
      maybeObj.error &&
      typeof maybeObj.error.message === 'string' &&
      maybeObj.error.message.trim().length > 0
    ) {
      return maybeObj.error.message;
    }
  }

  const raw = String(error ?? '').toLowerCase();
  if (raw.includes('startspeech') && raw.includes('null')) {
    return 'Puhemoduuli puuttuu natiivibuildista. Aja uusi Android/iOS build.';
  }

  return 'Puheentunnistus ei käynnistynyt.';
}

function isRecognizerBusyError(error: unknown): boolean {
  const raw = String(error ?? '').toLowerCase();
  return raw.includes('busy') || raw.includes('recognizer_busy');
}

function getVoiceModule(): VoiceModuleShape | null {
  // Stubbed voice module for simplified MVP builds.
  // The original implementation used @react-native-voice/voice which
  // is removed in the lightweight variant. Return null to indicate
  // the feature is unavailable in this build.
  return null;
}

export function useVoiceCommands(options: UseVoiceCommandsOptions = {}) {
  const { locale = 'fi-FI', onCommand } = options;
  const voice = useMemo(() => getVoiceModule(), []);
  const isAvailable = !!voice;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!voice) {
      setError(
        'Puhemoduuli ei latautunut. Sulje appi kokonaan ja aja uusi Android/iOS build.',
      );
      return;
    }

    voice.onSpeechResults = event => {
      const spokenText = event.value?.[0]?.trim() ?? '';
      setTranscript(spokenText);
      if (spokenText) {
        onCommand?.(spokenText.toLowerCase());
        // Auto-reset transcript after 3 seconds so it doesn't pile up
        setTimeout(() => setTranscript(''), 3000);
      }
    };

    voice.onSpeechError = event => {
      setIsListening(false);
      const errorMsg = event.error?.message ?? 'Puheentunnistus ei onnistunut.';
      setError(errorMsg);
      // Log error for debugging
      console.warn('[useVoiceCommands] Error:', errorMsg);
    };

    voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    return () => {
      try {
        voice.destroy().catch(() => undefined);
        voice.removeAllListeners();
      } catch {
        // Voice module is unavailable or already released.
      }
    };
  }, [voice, onCommand]);

  const ensurePermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    if (alreadyGranted) {
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Mikrofonilupa',
        message:
          'FocusPet tarvitsee mikrofonin, jotta lapsi voi ohjata tehtäviä puheella.',
        buttonPositive: 'Salli',
        buttonNegative: 'Peruuta',
      },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const startListening = useCallback(async () => {
    if (!voice) {
      setError(
        'Puheohjaus ei ole saatavilla tässä buildissa. Aja uusi Android/iOS build.',
      );
      return;
    }

    setError(null);
    const hasPermission = await ensurePermission();
    if (!hasPermission) {
      setError('Mikrofonilupaa ei annettu.');
      return;
    }

    try {
      setTranscript('');
      setIsListening(true);

      try {
        await voice.start(locale, {
          EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
          EXTRA_MAX_RESULTS: 1,
          EXTRA_PARTIAL_RESULTS: true,
        });
      } catch (firstError) {
        if (isRecognizerBusyError(firstError)) {
          await voice.cancel().catch(() => undefined);
          await wait(180);
          await voice.start(locale, {
            EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
            EXTRA_MAX_RESULTS: 1,
            EXTRA_PARTIAL_RESULTS: true,
          });
          return;
        }

        // Some devices reject fi-FI; retry once with a broad fallback locale.
        if (locale.toLowerCase() !== 'en-us') {
          await wait(120);
          await voice.start('en-US', {
            EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
            EXTRA_MAX_RESULTS: 1,
            EXTRA_PARTIAL_RESULTS: true,
          });
        } else {
          throw firstError;
        }
      }
    } catch (error) {
      setIsListening(false);
      setError(getErrorMessage(error));
    }
  }, [voice, ensurePermission, locale]);

  const stopListening = useCallback(async () => {
    if (!voice) {
      return;
    }

    try {
      await voice.stop();
    } catch {
      // Ignore stop errors from native layer.
    } finally {
      setIsListening(false);
    }
  }, [voice]);

  const cancelListening = useCallback(async () => {
    if (!voice) {
      return;
    }

    try {
      await voice.cancel();
    } catch {
      // Ignore cancel errors from native layer.
    } finally {
      setIsListening(false);
    }
  }, [voice]);

  return {
    isAvailable,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    cancelListening,
  };
}

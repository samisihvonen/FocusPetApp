import { useCallback } from 'react';

// Simplified stub for speech assistant. Full TTS support (react-native-tts)
// has been removed for the lightweight MVP. The hook exposes no-op
// functions so callers don't need to change.
export function useSpeechAssistant(enabled: boolean) {
  const speak = useCallback((_text: string, _interrupt = true) => {
    // no-op
  }, []);

  const stop = useCallback(() => {
    // no-op
  }, []);

  const announceDailyPlan = useCallback((_taskTitles: string[]) => {
    // no-op
  }, []);

  return { speak, stop, announceDailyPlan, isAvailable: false };
}

import { useCallback, useEffect, useState } from 'react';

// Try to use AsyncStorage if available, otherwise fall back to in-memory
let AsyncStorage: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage');
} catch {
  AsyncStorage = null;
}

const STORAGE_KEY = 'focuspet:simpleMode';

const memoryStore: Record<string, string> = {};

export function useSimpleMode(initial = false) {
  const [simpleMode, setSimpleMode] = useState<boolean>(initial);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (AsyncStorage) {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw != null && mounted) {
            setSimpleMode(raw === '1');
          }
        } else {
          const raw = memoryStore[STORAGE_KEY];
          if (raw != null && mounted) {
            setSimpleMode(raw === '1');
          }
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const enable = useCallback(async () => {
    setSimpleMode(true);
    try {
      if (AsyncStorage) {
        await AsyncStorage.setItem(STORAGE_KEY, '1');
      } else {
        memoryStore[STORAGE_KEY] = '1';
      }
    } catch {
      // ignore
    }
  }, []);

  const disable = useCallback(async () => {
    setSimpleMode(false);
    try {
      if (AsyncStorage) {
        await AsyncStorage.setItem(STORAGE_KEY, '0');
      } else {
        memoryStore[STORAGE_KEY] = '0';
      }
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    if (simpleMode) disable();
    else enable();
  }, [simpleMode, enable, disable]);

  return { simpleMode, enable, disable, toggle };
}

export default useSimpleMode;

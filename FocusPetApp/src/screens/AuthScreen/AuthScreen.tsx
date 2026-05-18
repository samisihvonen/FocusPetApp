import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function AuthScreen() {
  const { loginEmail, registerEmail, loginGoogle, status, error, clearError } = useAuthStore();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isLoading = status === 'loading';

  const isSubmitDisabled = useMemo(() => {
    if (isLoading) return true;
    if (!email.trim() || !password.trim()) return true;
    if (isRegisterMode && !username.trim()) return true;
    return false;
  }, [isLoading, email, password, isRegisterMode, username]);

  const handleEmailSubmit = async () => {
    clearError();
    try {
      if (isRegisterMode) {
        await registerEmail(username.trim(), email.trim(), password);
        return;
      }
      await loginEmail(email.trim(), password);
    } catch {
      // Error is already stored and shown via useAuthStore.error.
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    try {
      await loginGoogle();
    } catch {
      // Error is already stored and shown via useAuthStore.error.
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>FocusPet</Text>
          <Text style={styles.subtitle}>Kirjaudu sisaan jatkaaksesi</Text>
        </View>

        <View style={styles.card}>
          {isRegisterMode && (
            <TextInput
              style={styles.input}
              placeholder="Nimimerkki"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              value={username}
              onChangeText={setUsername}
              editable={!isLoading}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Sahkoposti"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Salasana"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitDisabled && styles.buttonDisabled]}
            onPress={handleEmailSubmit}
            disabled={isSubmitDisabled}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isRegisterMode ? 'Luo tili' : 'Kirjaudu sahkopostilla'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.googleButtonText}>Jatka Googlella</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              clearError();
              setIsRegisterMode(v => !v);
            }}
            disabled={isLoading}
            style={styles.modeSwitch}
          >
            <Text style={styles.modeSwitchText}>
              {isRegisterMode
                ? 'Onko sinulla jo tili? Kirjaudu sisaan'
                : 'Ei viela tili? Luo uusi tili'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: FONT.hero,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.textMuted,
    fontSize: FONT.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: RADIUS.xl,
    padding: 18,
    gap: 10,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FONT.md,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONT.sm,
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.text,
    fontSize: FONT.md,
    fontWeight: '700',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#111827',
    fontSize: FONT.md,
    fontWeight: '700',
  },
  modeSwitch: {
    marginTop: 8,
    alignItems: 'center',
  },
  modeSwitchText: {
    color: COLORS.xp,
    fontSize: FONT.sm,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
import { create } from 'zustand';
import {
  AuthUser,
  fetchMe,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  setAuthToken,
} from '../services/api';
import {
  mapGoogleError,
  requestGoogleIdToken,
  signOutGoogleIfSignedIn,
} from '../services/googleAuth';
import * as db from '../services/db';
import { useUserStore } from './useUserStore';

type AuthStatus = 'idle' | 'loading' | 'signed-in' | 'signed-out';

interface AuthStore {
  status: AuthStatus;
  token: string | null;
  user: AuthUser | null;
  error: string | null;
  loginEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  loginGoogle: () => Promise<void>;
  verifySession: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

function syncUserProfile(user: AuthUser) {
  useUserStore
    .getState()
    .setProfile(String(user.id), user.username, user.email);
}

function toUserMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  status: 'signed-out',
  token: null,
  user: null,
  error: null,

  loginEmail: async (email, password) => {
    set({ status: 'loading', error: null });
    try {
      // Try backend first, fall back to local database
      let response;
      try {
        response = await loginWithEmail(email, password);
      } catch {
        // Fall back to local database
        const user = await db.getUserByEmail(email);
        if (!user || user.passwordHash !== password) {
          throw new Error('Invalid email or password');
        }
        response = {
          token: 'local-token-' + user.id,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            coins: user.coins,
            xp: user.xp,
            level: user.level,
            streakDays: user.streakDays,
            lastActiveDate: user.lastActiveDate,
            authProvider: 'LOCAL',
          },
        };
      }
      setAuthToken(response.token);
      syncUserProfile(response.user);
      set({
        status: 'signed-in',
        token: response.token,
        user: response.user,
      });
    } catch (err) {
      set({
        status: 'signed-out',
        error: toUserMessage(err, 'Email login failed'),
      });
      throw err;
    }
  },

  registerEmail: async (username, email, password) => {
    set({ status: 'loading', error: null });
    try {
      // Try backend first, fall back to local database
      let response;
      try {
        response = await registerWithEmail(username, email, password);
      } catch {
        // Fall back to local database registration
        const existingByEmail = await db.getUserByEmail(email);
        const existingByUsername = await db.getUserByUsername(username);

        if (existingByEmail || existingByUsername) {
          throw new Error('Email or username already registered');
        }

        const newUser = {
          id: Date.now(),
          username,
          email,
          coins: 0,
          xp: 0,
          level: 1,
          streakDays: 0,
          lastActiveDate: null,
          passwordHash: password,
          authProvider: 'LOCAL' as const,
        };

        await db.createOrUpdateUser(newUser);
        response = {
          token: 'local-token-' + newUser.id,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            coins: newUser.coins,
            xp: newUser.xp,
            level: newUser.level,
            streakDays: newUser.streakDays,
            lastActiveDate: newUser.lastActiveDate,
            authProvider: 'LOCAL',
          },
        };
      }
      setAuthToken(response.token);
      syncUserProfile(response.user);
      set({
        status: 'signed-in',
        token: response.token,
        user: response.user,
      });
    } catch (err) {
      set({
        status: 'signed-out',
        error: toUserMessage(err, 'Registration failed'),
      });
      throw err;
    }
  },

  loginGoogle: async () => {
    set({ status: 'loading', error: null });
    try {
      const idToken = await requestGoogleIdToken();
      const response = await loginWithGoogle(idToken);
      setAuthToken(response.token);
      syncUserProfile(response.user);
      set({
        status: 'signed-in',
        token: response.token,
        user: response.user,
      });
    } catch (err) {
      set({
        status: 'signed-out',
        error: mapGoogleError(err),
      });
      throw err;
    }
  },

  verifySession: async () => {
    const token = get().token;
    if (!token) {
      set({ status: 'signed-out', user: null });
      return;
    }

    setAuthToken(token);
    try {
      const user = await fetchMe();
      syncUserProfile(user);
      set({ status: 'signed-in', user, error: null });
    } catch {
      setAuthToken(null);
      set({ status: 'signed-out', token: null, user: null });
    }
  },

  signOut: async () => {
    await signOutGoogleIfSignedIn().catch(() => undefined);
    setAuthToken(null);
    set({ status: 'signed-out', token: null, user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));

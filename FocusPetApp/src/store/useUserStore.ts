import { create } from 'zustand';

const XP_PER_LEVEL = 100;

interface UserState {
  id: string;
  username: string;
  coins: number;
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string | null;
  speechEnabled: boolean;
}

interface UserStore extends UserState {
  addCoins: (amount: number) => void;
  addXP: (amount: number) => void;
  checkStreak: () => void;
  toggleSpeech: () => void;
}

export const useUserStore = create<UserStore>()((set, get) => ({
  id: 'user-1',
  username: 'Niilo',
  coins: 0,
  xp: 0,
  level: 1,
  streakDays: 0,
  lastActiveDate: null,
  speechEnabled: true,

  addCoins: amount => set(s => ({ coins: s.coins + amount })),

  addXP: amount =>
    set(s => {
      const newXP = s.xp + amount;
      const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
      return { xp: newXP, level: newLevel };
    }),

  checkStreak: () => {
    const { lastActiveDate, streakDays } = get();
    const today = new Date().toDateString();
    if (lastActiveDate === today) {
      return;
    }
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    if (lastActiveDate === yesterday) {
      set({ streakDays: streakDays + 1, lastActiveDate: today });
    } else {
      set({ streakDays: 1, lastActiveDate: today });
    }
  },

  toggleSpeech: () => set(s => ({ speechEnabled: !s.speechEnabled })),
}));

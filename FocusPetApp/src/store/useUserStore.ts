import { create } from 'zustand';
import {
  GEMINI_API_KEY,
  WILMA_URL,
  HOBBY_URL,
  WILMA_USERNAME,
  WILMA_PASSWORD,
} from '../config/secrets';
import { HomeArrivalRule, WeekdayKey } from '../types';

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
  openAiKey: string;
  wilmaUrl: string;
  hobbyUrl: string;
  wilmaUsername: string;
  wilmaPassword: string;
  homeArrivalRules: HomeArrivalRule[];
}

interface UserStore extends UserState {
  adminPin: string;
  addCoins: (amount: number) => void;
  addXP: (amount: number) => void;
  checkStreak: () => void;
  toggleSpeech: () => void;
  setAdminPin: (pin: string) => void;
  setUsername: (name: string) => void;
  setOpenAiKey: (key: string) => void;
  setWilmaUrl: (url: string) => void;
  setHobbyUrl: (url: string) => void;
  setWilmaUsername: (u: string) => void;
  setWilmaPassword: (p: string) => void;
  setHomeArrivalRules: (rules: HomeArrivalRule[]) => void;
  updateHomeArrivalRule: (
    day: WeekdayKey,
    patch: Partial<Omit<HomeArrivalRule, 'day'>>,
  ) => void;
}

const DEFAULT_HOME_ARRIVAL_RULES: HomeArrivalRule[] = [
  { day: 'ma', sourceLabel: 'Koulu', arrivalStart: '14:20', arrivalEnd: '14:45' },
  { day: 'ti', sourceLabel: 'Iltis', arrivalStart: '14:20', arrivalEnd: '14:45' },
  { day: 'ke', sourceLabel: 'Sahlykerho', arrivalStart: '15:40', arrivalEnd: '16:00' },
  { day: 'to', sourceLabel: 'Koulu / harrastusryhma', arrivalStart: '14:00', arrivalEnd: '14:30' },
  { day: 'pe', sourceLabel: 'Iltis', arrivalStart: '15:00', arrivalEnd: '15:20' },
];

export const useUserStore = create<UserStore>()((set, get) => ({
  id: 'user-1',
  username: 'Niilo',
  coins: 0,
  xp: 0,
  level: 1,
  streakDays: 0,
  lastActiveDate: null,
  speechEnabled: true,
  adminPin: '1234',
  openAiKey: GEMINI_API_KEY ?? '',
  wilmaUrl: WILMA_URL ?? '',
  hobbyUrl: HOBBY_URL ?? '',
  wilmaUsername: WILMA_USERNAME ?? '',
  wilmaPassword: WILMA_PASSWORD ?? '',
  homeArrivalRules: DEFAULT_HOME_ARRIVAL_RULES,

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
  setAdminPin: pin => set({ adminPin: pin }),
  setUsername: name => set({ username: name }),
  setOpenAiKey: key => set({ openAiKey: key }),
  setWilmaUrl: url => set({ wilmaUrl: url }),
  setHobbyUrl: url => set({ hobbyUrl: url }),
  setWilmaUsername: u => set({ wilmaUsername: u }),
  setWilmaPassword: p => set({ wilmaPassword: p }),
  setHomeArrivalRules: rules => set({ homeArrivalRules: rules }),
  updateHomeArrivalRule: (day, patch) =>
    set(s => ({
      homeArrivalRules: s.homeArrivalRules.map(rule =>
        rule.day === day ? { ...rule, ...patch } : rule,
      ),
    })),
}));

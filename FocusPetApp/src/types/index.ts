// ─── Domain Types ────────────────────────────────────────────────────────────

export type TaskStatus = 'idle' | 'active' | 'completed';
export type PetMood = 'ecstatic' | 'happy' | 'neutral' | 'sad';

export interface User {
  id: number;
  username: string;
  email: string;
  coins: number;
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate?: string | null;
}

export interface Step {
  id: string;
  order: number;
  emoji: string;
  description: string;
  isDone: boolean;
  xpReward: number;
  coinReward: number;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  steps: Step[];
  totalXP: number;
  totalCoins: number;
  createdAt: string;
  completedAt?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  owned: boolean;
}

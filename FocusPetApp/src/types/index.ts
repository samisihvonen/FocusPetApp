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
  /** HH:MM — if set, this task blocks the time window [title-time, blockUntil) */
  blockUntil?: string;
}

// Shop feature archived for MVP; remove ShopItem frontend type to avoid accidental usage.
// Restore this interface if the Shop feature is re-enabled and backend endpoints return ShopItem data.

export type WeekdayKey = 'ma' | 'ti' | 'ke' | 'to' | 'pe';

export interface HomeArrivalRule {
  day: WeekdayKey;
  sourceLabel: string;
  arrivalStart: string;
  arrivalEnd: string;
}

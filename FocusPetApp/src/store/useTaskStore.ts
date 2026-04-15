import { create } from 'zustand';
import { Task } from '../types';

const ROUTINE_TITLE_REGEX = /^(?:([01]\d|2[0-3]):([0-5]\d))\s*[-–]\s*(.+)$/;

type RoutineTemplate = {
  time: string;
  title: string;
  steps: Array<{
    emoji: string;
    description: string;
    xpReward: number;
    coinReward: number;
  }>;
};

type AddTaskResult = {
  ok: boolean;
  reason?: 'duplicate-time' | 'brushing-time-restricted' | 'conflict-time';
};

export const DAILY_ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    time: '07:30',
    title: 'Aamun valmistautuminen',
    steps: [
      {
        emoji: '🛏️',
        description: 'Nouse sangysta ja avaa verhot',
        xpReward: 8,
        coinReward: 2,
      },
      {
        emoji: '🧼',
        description: 'Pese kasvot ja kayta deodoranttia',
        xpReward: 10,
        coinReward: 3,
      },
      {
        emoji: '🥣',
        description: 'Syo pieni aamupala',
        xpReward: 12,
        coinReward: 3,
      },
    ],
  },
  {
    time: '14:00',
    title: 'Iltapäivän läksyt',
    steps: [
      {
        emoji: '📚',
        description: 'Tee läksyt 20–30 minuuttia',
        xpReward: 18,
        coinReward: 5,
      },
      {
        emoji: '✅',
        description: 'Tarkista että kaikki tehtävät on tehty',
        xpReward: 10,
        coinReward: 3,
      },
    ],
  },
  {
    time: '14:30',
    title: 'välipalahetki',
    steps: [
      {
        emoji: '🍎',
        description: 'Syo välipala ja juo vetta',
        xpReward: 12,
        coinReward: 3,
      },
      {
        emoji: '🧽',
        description: 'Siivoa välipalapaikka nopeasti',
        xpReward: 8,
        coinReward: 2,
      },
    ],
  },
  {
    time: '15:00',
    title: 'Vapaa-aika tai ulkoilu',
    steps: [
      {
        emoji: '🎮',
        description: 'Voit pelata puhelimella tai tietokoneella hetken',
        xpReward: 8,
        coinReward: 2,
      },
      {
        emoji: '🌳',
        description: 'Tai mene ulos leikkimaan ja liikkumaan',
        xpReward: 14,
        coinReward: 4,
      },
    ],
  },
  {
    time: '19:30',
    title: 'Iltarutiini',
    steps: [
      {
        emoji: '🪥',
        description: 'Pese hampaat kaksi minuuttia',
        xpReward: 16,
        coinReward: 4,
      },
      {
        emoji: '🧴',
        description: 'Pese kasvot ja vaihda yovaatteet',
        xpReward: 10,
        coinReward: 3,
      },
      {
        emoji: '📘',
        description: 'Valmistele huominen: vaatteet ja reppu',
        xpReward: 12,
        coinReward: 3,
      },
    ],
  },
  {
    time: '20:30',
    title: 'Nukkumaan meneminen',
    steps: [
      {
        emoji: '📵',
        description: 'Laita puhelin sivuun',
        xpReward: 8,
        coinReward: 2,
      },
      {
        emoji: '🛏️',
        description: 'Mene sänkyyn ja asetu mukavasti',
        xpReward: 10,
        coinReward: 3,
      },
      {
        emoji: '🌙',
        description: 'Sulje silmät ja nuku hyvin',
        xpReward: 14,
        coinReward: 4,
      },
    ],
  },
];

export const WEEKEND_ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    time: '09:00',
    title: 'Rauhallinen aamu',
    steps: [
      {
        emoji: '🛏️',
        description: 'Nouse sängystä omaan tahtiin',
        xpReward: 6,
        coinReward: 2,
      },
      {
        emoji: '🧼',
        description: 'Pese kasvot ja käy kylpyhuoneessa',
        xpReward: 8,
        coinReward: 2,
      },
      {
        emoji: '🥞',
        description: 'Syö hyvä aamupala tai brunssi',
        xpReward: 10,
        coinReward: 3,
      },
    ],
  },
  {
    time: '11:00',
    title: 'Ulkoilu tai harrastus',
    steps: [
      {
        emoji: '🌳',
        description: 'Mene ulos — pyöräile, kävele tai leiki',
        xpReward: 16,
        coinReward: 5,
      },
      {
        emoji: '🏒',
        description: 'Tai mene harjoituksiin jos on vuoro',
        xpReward: 20,
        coinReward: 6,
      },
    ],
  },
  {
    time: '13:30',
    title: 'Lounas',
    steps: [
      {
        emoji: '🍽️',
        description: 'Syö lounas yhdessä perheen kanssa',
        xpReward: 10,
        coinReward: 3,
      },
      {
        emoji: '🧽',
        description: 'Auta siivoamaan ruokapöytä',
        xpReward: 8,
        coinReward: 2,
      },
    ],
  },
  {
    time: '15:00',
    title: 'Välipalahetki',
    steps: [
      {
        emoji: '🍎',
        description: 'Syö välipala ja juo vettä',
        xpReward: 10,
        coinReward: 3,
      },
    ],
  },
  {
    time: '16:00',
    title: 'Vapaa-aika',
    steps: [
      {
        emoji: '🎮',
        description: 'Voit pelata tai katsoa videoita sovitusti',
        xpReward: 6,
        coinReward: 2,
      },
      {
        emoji: '🎨',
        description: 'Tai tee jotain luovaa — piirrä, rakenna, lue',
        xpReward: 12,
        coinReward: 3,
      },
    ],
  },
  {
    time: '17:30',
    title: 'Pieni kotitehtävä',
    steps: [
      {
        emoji: '🧹',
        description: 'Siivoa oma huone pikaisesti',
        xpReward: 10,
        coinReward: 3,
      },
      {
        emoji: '📘',
        description: 'Tarkista onko kouluun jotain valmisteltavaa',
        xpReward: 8,
        coinReward: 2,
      },
    ],
  },
  {
    time: '19:30',
    title: 'Iltarutiini',
    steps: [
      {
        emoji: '🪥',
        description: 'Pese hampaat kaksi minuuttia',
        xpReward: 16,
        coinReward: 4,
      },
      {
        emoji: '🧴',
        description: 'Pese kasvot ja vaihda yövaatteet',
        xpReward: 10,
        coinReward: 3,
      },
      {
        emoji: '📘',
        description: 'Valmistele huominen: vaatteet ja reppu',
        xpReward: 12,
        coinReward: 3,
      },
    ],
  },
  {
    time: '21:00',
    title: 'Nukkumaan meneminen',
    steps: [
      {
        emoji: '📵',
        description: 'Laita puhelin sivuun',
        xpReward: 8,
        coinReward: 2,
      },
      {
        emoji: '🛏️',
        description: 'Mene sänkyyn ja asetu mukavasti',
        xpReward: 10,
        coinReward: 3,
      },
      {
        emoji: '🌙',
        description: 'Sulje silmät ja nuku hyvin',
        xpReward: 14,
        coinReward: 4,
      },
    ],
  },
];

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseTimedTaskTitle(title: string): {
  hour: number;
  minute: number;
  normalizedTitle: string;
} | null {
  const match = title.match(ROUTINE_TITLE_REGEX);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    normalizedTitle: match[3].trim().toLowerCase(),
  };
}

function isBrushingTask(task: Task): boolean {
  const titleHasKeyword = task.title.toLowerCase().includes('hamp');
  const stepsHaveKeyword = task.steps.some(step =>
    step.description.toLowerCase().includes('hamp'),
  );
  return titleHasKeyword || stepsHaveKeyword;
}

function isMorningOrEvening(hour: number): boolean {
  const isMorning = hour >= 5 && hour <= 10;
  const isEvening = hour >= 18 && hour <= 22;
  return isMorning || isEvening;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function createRoutineTask(template: RoutineTemplate, nowIso: string): Task {
  const taskId = `routine-${template.time}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const steps = template.steps.map((step, index) => ({
    id: `${taskId}-step-${index + 1}`,
    order: index + 1,
    emoji: step.emoji,
    description: step.description,
    isDone: false,
    xpReward: step.xpReward,
    coinReward: step.coinReward,
  }));

  const totalXP = steps.reduce((sum, step) => sum + step.xpReward, 0);
  const totalCoins = steps.reduce((sum, step) => sum + step.coinReward, 0);

  return {
    id: taskId,
    title: `${template.time} - ${template.title}`,
    status: 'idle',
    steps,
    totalXP,
    totalCoins,
    createdAt: nowIso,
  };
}

interface TaskStore {
  tasks: Task[];
  activeTask: Task | null;
  lastRoutineSeedDate: string | null;
  lastHobbySyncDate: string | null;
  addTask: (task: Task) => AddTaskResult;
  setActiveTask: (task: Task | null) => void;
  completeStep: (taskId: string, stepId: string) => void;
  completeTask: (taskId: string) => void;
  removeTask: (taskId: string) => void;
  resetDailyRoutines: () => void;
  ensureDailyRoutines: () => void;
  markHobbySynced: () => void;
}

export const useTaskStore = create<TaskStore>()(set => ({
  tasks: [],
  activeTask: null,
  lastRoutineSeedDate: null,
  lastHobbySyncDate: null,

  addTask: task => {
    let result: AddTaskResult = { ok: true };

    set(s => {
      const timedTask = parseTimedTaskTitle(task.title);

      if (
        timedTask &&
        isBrushingTask(task) &&
        !isMorningOrEvening(timedTask.hour)
      ) {
        result = { ok: false, reason: 'brushing-time-restricted' };
        return s;
      }

      if (timedTask) {
        const newTaskDay = localDateKey(new Date(task.createdAt));
        const newMin = timedTask.hour * 60 + timedTask.minute;

        // Block: new task falls inside an existing task's blockUntil window
        const blocked = s.tasks.some(existing => {
          if (!existing.blockUntil) return false;
          const existingTimed = parseTimedTaskTitle(existing.title);
          if (!existingTimed) return false;
          const sameDay =
            localDateKey(new Date(existing.createdAt)) === newTaskDay;
          if (!sameDay) return false;
          const existingStart = existingTimed.hour * 60 + existingTimed.minute;
          const existingEnd = toMinutes(existing.blockUntil);
          return newMin > existingStart && newMin < existingEnd;
        });
        if (blocked) {
          result = { ok: false, reason: 'conflict-time' };
          return s;
        }

        // Clear: new task has blockUntil → remove idle tasks inside its window
        let tasks = s.tasks;
        if (task.blockUntil) {
          const newEnd = toMinutes(task.blockUntil);
          tasks = s.tasks.filter(existing => {
            if (existing.status !== 'idle') return true;
            const existingTimed = parseTimedTaskTitle(existing.title);
            if (!existingTimed) return true;
            const sameDay =
              localDateKey(new Date(existing.createdAt)) === newTaskDay;
            if (!sameDay) return true;
            const existingMin = existingTimed.hour * 60 + existingTimed.minute;
            return !(existingMin > newMin && existingMin < newEnd);
          });
        }

        const duplicateExists = tasks.some(existing => {
          const existingTimed = parseTimedTaskTitle(existing.title);
          if (!existingTimed) return false;
          const sameDay =
            localDateKey(new Date(existing.createdAt)) === newTaskDay;
          const sameTime =
            existingTimed.hour === timedTask.hour &&
            existingTimed.minute === timedTask.minute;
          const sameTitle =
            existingTimed.normalizedTitle === timedTask.normalizedTitle;
          return sameDay && sameTime && sameTitle;
        });

        if (duplicateExists) {
          result = { ok: false, reason: 'duplicate-time' };
          return s;
        }

        return { ...s, tasks: [task, ...tasks] };
      }

      return { ...s, tasks: [task, ...s.tasks] };
    });

    return result;
  },

  setActiveTask: task => set({ activeTask: task }),

  completeStep: (taskId, stepId) =>
    set(s => {
      const tasks = s.tasks.map(t => {
        if (t.id !== taskId) {
          return t;
        }
        const steps = t.steps.map(step =>
          step.id === stepId ? { ...step, isDone: true } : step,
        );
        return { ...t, steps };
      });
      const activeTask =
        s.activeTask?.id === taskId
          ? tasks.find(t => t.id === taskId) ?? null
          : s.activeTask;
      return { tasks, activeTask };
    }),

  completeTask: taskId =>
    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === taskId
          ? { ...t, status: 'completed', completedAt: new Date().toISOString() }
          : t,
      ),
      activeTask: null,
    })),

  removeTask: taskId =>
    set(s => ({
      tasks: s.tasks.filter(t => t.id !== taskId),
      activeTask: s.activeTask?.id === taskId ? null : s.activeTask,
    })),

  resetDailyRoutines: () =>
    set(s => ({
      ...s,
      tasks: s.tasks.filter(t => !ROUTINE_TITLE_REGEX.test(t.title)),
      lastRoutineSeedDate: null,
    })),

  markHobbySynced: () =>
    set(() => ({ lastHobbySyncDate: localDateKey(new Date()) })),

  ensureDailyRoutines: () =>
    set(s => {
      const todayKey = localDateKey(new Date());
      if (s.lastRoutineSeedDate === todayKey) {
        return s;
      }

      const hasTodayRoutine = s.tasks.some(task => {
        if (!ROUTINE_TITLE_REGEX.test(task.title)) {
          return false;
        }

        const createdDate = new Date(task.createdAt);
        return (
          !Number.isNaN(createdDate.getTime()) &&
          localDateKey(createdDate) === todayKey
        );
      });

      if (hasTodayRoutine) {
        return { ...s, lastRoutineSeedDate: todayKey };
      }

      const nowIso = new Date().toISOString();
      const templates = isWeekend(new Date())
        ? WEEKEND_ROUTINE_TEMPLATES
        : DAILY_ROUTINE_TEMPLATES;
      const generatedTasks = templates.map(template =>
        createRoutineTask(template, nowIso),
      );

      return {
        ...s,
        tasks: [...generatedTasks, ...s.tasks],
        lastRoutineSeedDate: todayKey,
      };
    }),
}));

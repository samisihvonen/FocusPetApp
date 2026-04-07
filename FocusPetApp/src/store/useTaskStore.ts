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
  reason?: 'duplicate-time' | 'brushing-time-restricted';
};

const DAILY_ROUTINE_TEMPLATES: RoutineTemplate[] = [
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
    title: 'Iltapaivan laksyt',
    steps: [
      {
        emoji: '📚',
        description: 'Tee laksyt 20-30 minuuttia',
        xpReward: 18,
        coinReward: 5,
      },
      {
        emoji: '✅',
        description: 'Tarkista etta kaikki tehtavat on tehty',
        xpReward: 10,
        coinReward: 3,
      },
    ],
  },
  {
    time: '14:30',
    title: 'Valipalahetki',
    steps: [
      {
        emoji: '🍎',
        description: 'Syo valipala ja juo vetta',
        xpReward: 12,
        coinReward: 3,
      },
      {
        emoji: '🧽',
        description: 'Siivoa valipalapaikka nopeasti',
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
    title: 'Rauhoittuminen',
    steps: [
      {
        emoji: '📵',
        description: 'Laita puhelin sivuun',
        xpReward: 8,
        coinReward: 2,
      },
      {
        emoji: '🫧',
        description: 'Hengita rauhassa 1 minuutti',
        xpReward: 10,
        coinReward: 3,
      },
      {
        emoji: '🌙',
        description: 'Mene nukkumaan ajoissa',
        xpReward: 14,
        coinReward: 4,
      },
    ],
  },
];

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
  addTask: (task: Task) => AddTaskResult;
  setActiveTask: (task: Task | null) => void;
  completeStep: (taskId: string, stepId: string) => void;
  completeTask: (taskId: string) => void;
  ensureDailyRoutines: () => void;
}

export const useTaskStore = create<TaskStore>()(set => ({
  tasks: [],
  activeTask: null,
  lastRoutineSeedDate: null,

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
        const duplicateExists = s.tasks.some(existing => {
          const existingTimed = parseTimedTaskTitle(existing.title);
          if (!existingTimed) {
            return false;
          }

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
      const generatedTasks = DAILY_ROUTINE_TEMPLATES.map(template =>
        createRoutineTask(template, nowIso),
      );

      return {
        ...s,
        tasks: [...generatedTasks, ...s.tasks],
        lastRoutineSeedDate: todayKey,
      };
    }),
}));

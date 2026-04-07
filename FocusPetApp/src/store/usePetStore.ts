import { create } from 'zustand';
import { PetMood } from '../types';

interface PetState {
  name: string;
  mood: PetMood;
  happiness: number; // 0 – 100
  accessories: string[];
}

interface PetStore extends PetState {
  feed: () => void;
  decayHappiness: () => void;
  addAccessory: (item: string) => void;
}

function moodFromHappiness(h: number): PetMood {
  if (h >= 80) {
    return 'ecstatic';
  }
  if (h >= 55) {
    return 'happy';
  }
  if (h >= 30) {
    return 'neutral';
  }
  return 'sad';
}

export const usePetStore = create<PetStore>()(set => ({
  name: 'Pöllö',
  mood: 'happy',
  happiness: 70,
  accessories: [],

  feed: () =>
    set(s => {
      const happiness = Math.min(100, s.happiness + 20);
      return { happiness, mood: moodFromHappiness(happiness) };
    }),

  decayHappiness: () =>
    set(s => {
      const happiness = Math.max(0, s.happiness - 5);
      return { happiness, mood: moodFromHappiness(happiness) };
    }),

  addAccessory: item => set(s => ({ accessories: [...s.accessories, item] })),
}));

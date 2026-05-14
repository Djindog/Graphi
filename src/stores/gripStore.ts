import { create } from 'zustand';
import type { GripLevel } from '../types';

interface GripState {
  gripLevel: GripLevel;
  setGripLevel: (level: GripLevel) => void;
  getMinScore: () => number | null;
  shouldPerformRAG: () => boolean;
}

const scoreMap: Record<GripLevel, number | null> = {
  off: null,
  low: 0.5,
  mid: 0.7,
  high: 0.9,
};

const matchCountMap: Record<GripLevel, number> = {
  off: 0,
  low: 15,
  mid: 8,
  high: 3,
};

export const useGripStore = create<GripState>((set, get) => ({
  gripLevel: 'mid',
  setGripLevel: (level) => set({ gripLevel: level }),
  getMinScore: () => scoreMap[get().gripLevel],
  shouldPerformRAG: () => get().gripLevel !== 'off',
}));

export { matchCountMap, scoreMap };

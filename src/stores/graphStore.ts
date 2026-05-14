import { create } from 'zustand';
import type { GraphMode } from '../types';

interface GraphState {
  graphMode: GraphMode;
  setGraphMode: (mode: GraphMode) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graphMode: 'tree',
  setGraphMode: (mode) => set({ graphMode: mode }),
}));

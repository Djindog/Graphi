import { create } from 'zustand';

type NavigationTrigger = 'single-click' | 'double-click' | 'arrow' | 'button' | null;

interface CanvasState {
  navigationTrigger: NavigationTrigger;
  setNavigationTrigger: (trigger: NavigationTrigger) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  navigationTrigger: null,
  setNavigationTrigger: (trigger) => set({ navigationTrigger: trigger }),
}));

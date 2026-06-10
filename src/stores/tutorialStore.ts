import { create } from 'zustand';
import { useDagStore } from './dagStore';
import { supabase } from '../lib/supabase';

export type TutorialStepId =
  | 'welcome' | 'create-project' | 'name-project' | 'type-question' | 'wait-response'
  | 'branch-from-menu' | 'auto-create-tree' | 'select-node-context' | 'explain-context-bar'
  | 'ctrl-click-add' | 'ctrl-click-remove' | 'deactivate-from-bar' | 'reactivate-from-bar'
  | 'fold-node' | 'unfold-node' | 'cut-node' | 'undo-delete' | 'delete-subtree' | 'undo-subtree'
  | 'ctrl-arrow-up' | 'ctrl-arrow-down' | 'done';

export const TUTORIAL_STEPS: TutorialStepId[] = [
  'welcome', 'create-project', 'name-project', 'type-question', 'wait-response',
  'branch-from-menu', 'auto-create-tree', 'select-node-context', 'explain-context-bar',
  'ctrl-click-add', 'ctrl-click-remove', 'deactivate-from-bar', 'reactivate-from-bar',
  'fold-node', 'unfold-node', 'cut-node', 'undo-delete', 'delete-subtree', 'undo-subtree',
  'ctrl-arrow-up', 'ctrl-arrow-down', 'done',
];

export interface TutorialNodeIds {
  projectId: string | null;
  rootNodeId: string | null;
  branch1NodeId: string | null;
  autoChild1Id: string | null;
  autoSibling1Id: string | null;
  autoSibling1ChildId: string | null;
  autoLeafId: string | null;
  autoNodesCreated: boolean;
}

interface TutorialState {
  isActive: boolean;
  currentStepIndex: number;
  inputError: string | null;
  nodeIds: TutorialNodeIds;
  start: () => void;
  advance: () => void;
  back: () => void;
  skip: () => Promise<void>;
  finish: () => Promise<void>;
  advanceIfOnStep: (stepId: TutorialStepId) => void;
  setInputError: (err: string | null) => void;
  setNodeIds: (ids: Partial<TutorialNodeIds>) => void;
  currentStepId: () => TutorialStepId;
  createAutoNodes: () => Promise<void>;
  cleanupProject: (projectId?: string) => Promise<void>;
}

const emptyNodeIds: TutorialNodeIds = {
  projectId: null, rootNodeId: null, branch1NodeId: null,
  autoChild1Id: null, autoSibling1Id: null, autoSibling1ChildId: null,
  autoLeafId: null, autoNodesCreated: false,
};

const LS_KEY = 'graphi_tutorial_project_id';

export const useTutorialStore = create<TutorialState>((set, get) => ({
  isActive: false,
  currentStepIndex: 0,
  inputError: null,
  nodeIds: { ...emptyNodeIds },

  start: () => set({ isActive: true, currentStepIndex: 0, inputError: null, nodeIds: { ...emptyNodeIds } }),

  advance: () => set(s => ({
    currentStepIndex: Math.min(s.currentStepIndex + 1, TUTORIAL_STEPS.length - 1),
    inputError: null,
  })),

  back: () => set(s => ({
    currentStepIndex: Math.max(0, s.currentStepIndex - 1),
    inputError: null,
  })),

  skip: async () => {
    const projectId = get().nodeIds.projectId;
    localStorage.setItem('graphi_tutorial_done', '1');
    set({ nodeIds: { ...emptyNodeIds } });
    if (projectId) await get().cleanupProject(projectId);
    set({ isActive: false, currentStepIndex: 0 });
  },

  finish: async () => {
    const projectId = get().nodeIds.projectId;
    localStorage.setItem('graphi_tutorial_done', '1');
    set({ nodeIds: { ...emptyNodeIds } });
    if (projectId) await get().cleanupProject(projectId);
    set({ isActive: false, currentStepIndex: 0 });
  },

  advanceIfOnStep: (stepId) => {
    const { isActive, currentStepIndex } = get();
    if (!isActive) return;
    if (TUTORIAL_STEPS[currentStepIndex] === stepId) get().advance();
  },

  setInputError: (err) => set({ inputError: err }),

  setNodeIds: (ids) => set(s => ({ nodeIds: { ...s.nodeIds, ...ids } })),

  currentStepId: () => TUTORIAL_STEPS[get().currentStepIndex],

  cleanupProject: async (projectId?: string) => {
    const id = projectId ?? get().nodeIds.projectId ?? localStorage.getItem(LS_KEY);
    if (!id) return;
    try {
      const { data: projectNodes } = await supabase.from('nodes').select('id').eq('projectId', id);
      const nodeIds = (projectNodes ?? []).map((n: { id: string }) => n.id);
      await supabase.from('projects').update({ rootNodeId: null }).eq('id', id);
      if (nodeIds.length > 0) {
        await supabase.from('messages').delete().in('nodeId', nodeIds);
        await supabase.from('snapshots').delete().in('nodeId', nodeIds);
        await supabase.from('nodes').delete().eq('projectId', id);
      }
      await supabase.from('projects').delete().eq('id', id);
    } catch (err) {
      console.error('Tutorial cleanup error:', err);
    }
    localStorage.removeItem(LS_KEY);
    // Also clear local dag state for this project
    useDagStore.setState(s => ({ nodes: s.nodes.filter(n => n.projectId !== id) }));
  },

  createAutoNodes: async () => {
    const { nodeIds } = get();
    if (nodeIds.autoNodesCreated) return;
    if (!nodeIds.projectId || !nodeIds.rootNodeId || !nodeIds.branch1NodeId) return;
    const { addNode } = useDagStore.getState();

    const autoChild1 = await addNode('Branching', nodeIds.branch1NodeId, nodeIds.projectId);
    const autoSibling1 = await addNode('Context', nodeIds.rootNodeId, nodeIds.projectId);
    const autoSibling1Child = await addNode('Context control', autoSibling1.id, nodeIds.projectId);
    const autoLeaf = await addNode('Limitations', nodeIds.rootNodeId, nodeIds.projectId);

    set(s => ({
      nodeIds: {
        ...s.nodeIds,
        autoChild1Id: autoChild1.id,
        autoSibling1Id: autoSibling1.id,
        autoSibling1ChildId: autoSibling1Child.id,
        autoLeafId: autoLeaf.id,
        autoNodesCreated: true,
      },
    }));
  },
}));

export { LS_KEY as TUTORIAL_PROJECT_LS_KEY };

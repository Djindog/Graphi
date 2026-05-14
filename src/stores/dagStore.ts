import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import type { Node } from '../types';

interface DagState {
  nodes: Node[];
  addNode: (title: string | null, parentId: string | null, projectId: string) => Promise<Node>;
  updateNodeContent: (id: string, content: string) => Promise<void>;
  renameNode: (id: string, title: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  getNodesByProject: (projectId: string) => Node[];
  getAllAncestors: (nodeId: string) => Node[];
  getDescendants: (nodeId: string) => Node[];
  setFromSupabase: (nodes: Node[]) => void;
  subscribeToProjectNodes: (projectId: string) => () => void;
}

export const useDagStore = create<DagState>((set, get) => ({
  nodes: [],

  addNode: async (title, parentId, projectId) => {
    const now = new Date().toISOString();
    const node: Node = {
      id: uuidv4(),
      projectId,
      title,
      content: null,
      parentId,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const { error } = await supabase.from('nodes').insert(node);
    if (error) throw error;
    set(s => ({ nodes: [...s.nodes, node] }));
    return node;
  },

  updateNodeContent: async (id, content) => {
    const updatedAt = new Date().toISOString();
    await supabase.from('nodes').update({ content, updatedAt }).eq('id', id);
    set(s => ({ nodes: s.nodes.map(n => (n.id === id ? { ...n, content, updatedAt } : n)) }));
  },

  renameNode: async (id, title) => {
    const updatedAt = new Date().toISOString();
    await supabase.from('nodes').update({ title, updatedAt }).eq('id', id);
    set(s => ({ nodes: s.nodes.map(n => (n.id === id ? { ...n, title, updatedAt } : n)) }));
  },

  deleteNode: async (id) => {
    await supabase.from('nodes').delete().eq('id', id);
    set(s => ({ nodes: s.nodes.filter(n => n.id !== id) }));
  },

  getNodesByProject: (projectId) => get().nodes.filter(n => n.projectId === projectId),

  getAllAncestors: (nodeId) => {
    const { nodes } = get();
    const map = new Map(nodes.map(n => [n.id, n]));
    const ancestors: Node[] = [];
    let current = map.get(nodeId);
    while (current?.parentId) {
      const parent = map.get(current.parentId);
      if (!parent) break;
      ancestors.push(parent);
      current = parent;
    }
    return ancestors;
  },

  getDescendants: (nodeId) => {
    const { nodes } = get();
    const result: Node[] = [];
    const queue = [nodeId];
    while (queue.length) {
      const id = queue.shift()!;
      const children = nodes.filter(n => n.parentId === id);
      result.push(...children);
      queue.push(...children.map(c => c.id));
    }
    return result;
  },

  setFromSupabase: (nodes) => set({ nodes }),

  subscribeToProjectNodes: (projectId) => {
    const channel = supabase
      .channel(`nodes_project_${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nodes', filter: `projectId=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            set(s => {
              if (s.nodes.find(n => n.id === (payload.new as Node).id)) return s;
              return { nodes: [...s.nodes, payload.new as Node] };
            });
          } else if (payload.eventType === 'UPDATE') {
            set(s => ({
              nodes: s.nodes.map(n =>
                n.id === (payload.new as Node).id ? (payload.new as Node) : n
              ),
            }));
          } else if (payload.eventType === 'DELETE') {
            set(s => ({ nodes: s.nodes.filter(n => n.id !== (payload.old as Node).id) }));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },
}));

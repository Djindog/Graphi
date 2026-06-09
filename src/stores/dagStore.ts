import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import type { Node, Message } from '../types';

interface UndoEntry {
  nodes: Node[];
  messages: Message[];
}

interface DagState {
  nodes: Node[];
  navigationStack: string[];
  undoStack: UndoEntry[];
  addNode: (title: string | null, parentId: string | null, projectId: string) => Promise<Node>;
  updateNodeContent: (id: string, content: string) => Promise<void>;
  renameNode: (id: string, title: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  deleteSubtree: (id: string) => Promise<void>;
  pushUndoSnapshot: (messages?: Message[]) => void;
  getNodesByProject: (projectId: string) => Node[];
  getAllAncestors: (nodeId: string) => Node[];
  getDescendants: (nodeId: string) => Node[];
  getSiblings: (nodeId: string) => Node[];
  getPrevSibling: (nodeId: string) => Node | null;
  getNextSibling: (nodeId: string) => Node | null;
  getFirstChild: (nodeId: string) => Node | null;
  pushNavigationStack: (nodeId: string) => void;
  popNavigationStack: () => string | null;
  reorderSiblings: (nodeId: string, newOrder: number) => Promise<void>;
  undo: () => Promise<void>;
  setFromSupabase: (nodes: Node[]) => void;
  subscribeToProjectNodes: (projectId: string) => () => void;
}

export const useDagStore = create<DagState>((set, get) => ({
  nodes: [],
  navigationStack: [],
  undoStack: [],

  pushUndoSnapshot: (messages = []) => {
    set(s => ({ undoStack: [...s.undoStack, { nodes: [...s.nodes], messages }] }));
  },

  addNode: async (title, parentId, projectId) => {
    get().pushUndoSnapshot();
    const now = new Date().toISOString();
    const siblings = get().nodes.filter(n => n.parentId === parentId && n.projectId === projectId);
    const order = siblings.length > 0 ? Math.max(...siblings.map(n => n.order ?? 0)) + 1 : 0;
    const node: Node = {
      id: uuidv4(),
      projectId,
      title,
      content: null,
      parentId,
      order,
      version: 1,
      summary: null,
      embedding: null,
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
    const { data: msgs } = await supabase.from('messages').select('*').eq('nodeId', id);
    get().pushUndoSnapshot(msgs ?? []);
    await supabase.from('nodes').delete().eq('id', id);
    set(s => ({ nodes: s.nodes.filter(n => n.id !== id) }));
  },

  deleteSubtree: async (id) => {
    const descendants = get().getDescendants(id);
    const toDelete = [id, ...descendants.map(n => n.id)];
    const { data: msgs } = await supabase.from('messages').select('*').in('nodeId', toDelete);
    get().pushUndoSnapshot(msgs ?? []);
    await supabase.from('nodes').delete().in('id', toDelete);
    set(s => ({ nodes: s.nodes.filter(n => !toDelete.includes(n.id)) }));
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

  getSiblings: (nodeId) => {
    const { nodes } = get();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];
    return nodes
      .filter(n => n.parentId === node.parentId && n.projectId === node.projectId && n.id !== nodeId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  getPrevSibling: (nodeId) => {
    const { nodes } = get();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;
    const siblings = nodes
      .filter(n => n.parentId === node.parentId && n.projectId === node.projectId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = siblings.findIndex(n => n.id === nodeId);
    return idx > 0 ? siblings[idx - 1] : null;
  },

  getNextSibling: (nodeId) => {
    const { nodes } = get();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;
    const siblings = nodes
      .filter(n => n.parentId === node.parentId && n.projectId === node.projectId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = siblings.findIndex(n => n.id === nodeId);
    return idx < siblings.length - 1 ? siblings[idx + 1] : null;
  },

  getFirstChild: (nodeId) => {
    const { nodes } = get();
    const children = nodes
      .filter(n => n.parentId === nodeId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return children.length > 0 ? children[0] : null;
  },

  pushNavigationStack: (nodeId) => {
    set(s => ({ navigationStack: [...s.navigationStack, nodeId] }));
  },

  popNavigationStack: () => {
    let popped: string | null = null;
    set(s => {
      if (s.navigationStack.length === 0) return s;
      const newStack = [...s.navigationStack];
      popped = newStack.pop() || null;
      return { navigationStack: newStack };
    });
    return popped;
  },

  reorderSiblings: async (nodeId, newOrder) => {
    const { nodes } = get();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) { console.log('Node not found:', nodeId); return; }

    const siblings = nodes
      .filter(n => n.parentId === node.parentId && n.projectId === node.projectId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const oldIndex = siblings.findIndex(n => n.id === nodeId);
    console.log('Reorder: oldIndex=', oldIndex, 'newOrder=', newOrder);
    if (oldIndex === newOrder) { console.log('No change, returning'); return; } // no change

    get().pushUndoSnapshot();

    // Recompute orders for affected siblings
    const updated: Node[] = [];
    siblings.forEach((n, i) => {
      let newSiblingOrder = n.order ?? 0;
      if (n.id === nodeId) {
        newSiblingOrder = newOrder;
      } else if (oldIndex < newOrder) {
        // Moving down: nodes between oldIndex and newOrder shift up
        if (i > oldIndex && i <= newOrder) newSiblingOrder = (n.order ?? 0) - 1;
      } else {
        // Moving up: nodes between newOrder and oldIndex shift down
        if (i >= newOrder && i < oldIndex) newSiblingOrder = (n.order ?? 0) + 1;
      }
      updated.push({ ...n, order: newSiblingOrder });
      console.log('Updated node', n.id, 'order:', newSiblingOrder);
    });

    // Batch update to DB
    console.log('Syncing to DB...');
    try {
      const results = await Promise.all(
        updated.map(async (n) => {
          const { error } = await supabase
            .from('nodes')
            .update({ order: n.order, updatedAt: new Date().toISOString() })
            .eq('id', n.id);
          if (error) {
            console.error('Update error for node', n.id, ':', error);
            return false;
          }
          return true;
        })
      );
      console.log('DB sync completed, results:', results);
      if (results.some(r => !r)) {
        console.error('Some updates failed');
        return;
      }
    } catch (error) {
      console.error('DB sync error:', error);
      return;
    }

    console.log('Updating store with', updated.length, 'nodes');
    set(s => ({
      nodes: s.nodes.map(n => updated.find(u => u.id === n.id) || n)
    }));
    console.log('Store updated');
  },

  undo: async () => {
    const { undoStack, nodes } = get();
    if (undoStack.length === 0) return;
    const { nodes: previous, messages: savedMessages } = undoStack[undoStack.length - 1];

    const prevMap = new Map(previous.map(n => [n.id, n]));
    const currMap = new Map(nodes.map(n => [n.id, n]));

    const toInsert = previous.filter(n => !currMap.has(n.id));
    const toDelete = nodes.filter(n => !prevMap.has(n.id));
    const toUpdate = previous.filter(n => {
      const curr = currMap.get(n.id);
      return curr && curr.order !== n.order;
    });

    set(s => ({ undoStack: s.undoStack.slice(0, -1), nodes: previous }));

    await Promise.all([
      ...toInsert.map(n => supabase.from('nodes').upsert(n)),
      ...toDelete.map(n => supabase.from('nodes').delete().eq('id', n.id)),
      ...toUpdate.map(n => supabase.from('nodes').update({ order: n.order }).eq('id', n.id)),
      ...(savedMessages.length > 0 ? [supabase.from('messages').upsert(savedMessages)] : []),
    ]);
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
            const updatedNode = payload.new as Node;
            console.log('Subscription UPDATE event:', updatedNode.id, 'order:', updatedNode.order);
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

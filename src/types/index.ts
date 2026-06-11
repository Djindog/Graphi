export interface Project {
  id: string;
  name: string;
  userId: string;
  rootNodeId: string | null;
  createdAt: string;
  isPinned?: boolean;
}

export interface Node {
  id: string;
  projectId: string;
  title: string | null;
  content: string | null;
  parentId: string | null;
  order: number;
  version: number;
  summary: string | null;
  embedding: number[] | null;
  isOrphan?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  nodeId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Snapshot {
  id: string;
  nodeId: string;
  version: number;
  content: string;
  prompt: string;
  parentNodeId: string | null;
  referencedNodeIds: string[];
  recommendedNodeIds: string[];
  activeContext: string[];
  deactivatedNodes: string[];
  model: string;
  generatedAt: string;
}

export type GripLevel = 'off' | 'low' | 'mid' | 'high';
export type GraphMode = 'tree' | 'force';

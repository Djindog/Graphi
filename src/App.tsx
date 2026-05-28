import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { useDagStore } from './stores/dagStore';
import { useChatStore } from './stores/chatStore';
import { makeGroqClient } from './lib/groq';
import { AuthPage } from './components/Auth/AuthPage';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Canvas } from './components/Canvas/Canvas';
import { ChatPane } from './components/Chat/ChatPane';
import { ToastContainer } from './components/Toast';
import { ApiKeyModal } from './components/ApiKeyModal';
import type { ToastMessage } from './components/Toast';
import type { Project } from './types';
import type Groq from 'groq-sdk';

type GroqClient = InstanceType<typeof Groq>;

const MIN_CHAT_WIDTH = 240;
const DEFAULT_CHAT_WIDTH = 500;

function getSidebarWidth(collapsed: boolean) {
  return collapsed ? 48 : 220;
}

function maxChatWidth(sidebarCollapsed: boolean) {
  return Math.floor((window.innerWidth - getSidebarWidth(sidebarCollapsed)) / 2);
}

async function loadGroqKey(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('groq_api_key')
    .eq('id', userId)
    .single();
  return (data as { groq_api_key: string | null } | null)?.groq_api_key ?? null;
}

async function saveGroqKey(userId: string, key: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, groq_api_key: key }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [groqClient, setGroqClient] = useState<GroqClient | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showSettingsKeyModal, setShowSettingsKeyModal] = useState(false);
  const [currentGroqKey, setCurrentGroqKey] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [chatPaneWidth, setChatPaneWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [dividerHovered, setDividerHovered] = useState(false);
  const dragState = useRef<{ startX: number; startWidth: number; maxW: number } | null>(null);

  const { setFromSupabase, subscribeToProjectNodes, getNodesByProject } = useDagStore();
  const setCurrentNode = useChatStore(s => s.setCurrentNode);

  useEffect(() => {
    const max = maxChatWidth(sidebarCollapsed);
    setChatPaneWidth(w => Math.min(w, max));
  }, [sidebarCollapsed]);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
    const id = uuidv4();
    setToasts(t => [...t, { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const initUserSession = useCallback(async (u: User) => {
    const key = await loadGroqKey(u.id);
    if (key) {
      setGroqClient(makeGroqClient(key));
      setCurrentGroqKey(key);
    } else {
      setShowKeyModal(true);
    }
    loadAllProjects(u.id);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) initUserSession(u);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        initUserSession(u);
      } else {
        setProjects([]);
        setActiveProject(null);
        setGroqClient(null);
        setCurrentGroqKey('');
      }
    });
    return () => subscription.unsubscribe();
  }, [initUserSession]);

  const loadAllProjects = async (userId: string) => {
    const { data, error } = await supabase
      .from('projects').select('*').eq('userId', userId).order('createdAt', { ascending: false });
    if (error) { console.error(error); return; }
    if (data) setProjects(data as Project[]);
  };

  const handleSaveKey = async (key: string) => {
    if (!user) return;
    await saveGroqKey(user.id, key);
    setGroqClient(makeGroqClient(key));
    setCurrentGroqKey(key);
    setShowKeyModal(false);
    setShowSettingsKeyModal(false);
  };

  const handleSelectProject = async (project: Project) => {
    setActiveProject(project);
    const { data } = await supabase
      .from('nodes').select('*').eq('projectId', project.id).order('createdAt', { ascending: true });
    if (data) {
      setFromSupabase(data);
      subscribeToProjectNodes(project.id);
      if (project.rootNodeId) await setCurrentNode(project.rootNodeId);
    }
  };

  const handleProjectCreated = (project: Project) => {
    setProjects(prev => [project, ...prev.filter(p => p.id !== project.id)]);
    handleSelectProject(project);
    addToast(`"${project.name}" created`);
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProject?.id === projectId) setActiveProject(null);
  };

  const handleProjectRenamed = (projectId: string, name: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name } : p));
    if (activeProject?.id === projectId) setActiveProject(prev => prev ? { ...prev, name } : prev);
  };

  const onDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const maxW = maxChatWidth(sidebarCollapsed);
    dragState.current = { startX: e.clientX, startWidth: chatPaneWidth, maxW };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const delta = dragState.current.startX - ev.clientX;
      setChatPaneWidth(Math.max(MIN_CHAT_WIDTH, Math.min(dragState.current.maxW, dragState.current.startWidth + delta)));
    };
    const onUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F6F8] text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const projectNodes = activeProject ? getNodesByProject(activeProject.id) : [];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        activeProjectId={activeProject?.id ?? null}
        projects={projects}
        onSelectProject={handleSelectProject}
        onProjectCreated={handleProjectCreated}
        onProjectDeleted={handleProjectDeleted}
        onProjectRenamed={handleProjectRenamed}
        onError={msg => addToast(msg, 'error')}
        onOpenSettings={() => setShowSettingsKeyModal(true)}
      />
      <Canvas
        nodes={projectNodes}
        rootNodeId={activeProject?.rootNodeId ?? null}
        projects={projects}
        onProjectCreated={handleProjectCreated}
      />

      <div
        onMouseDown={onDividerMouseDown}
        onMouseEnter={() => setDividerHovered(true)}
        onMouseLeave={() => setDividerHovered(false)}
        style={{ width: 8, flexShrink: 0, cursor: 'col-resize', position: 'relative', zIndex: 10, display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}
      >
        <div style={{ width: dividerHovered ? 3 : 1, background: dividerHovered ? '#9CA3AF' : '#E5E7EB', transition: 'width 0.12s ease, background 0.12s ease', borderRadius: 2 }} />
      </div>

      <ChatPane width={chatPaneWidth} groqClient={groqClient} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Blocking key entry — shown when user has no key stored */}
      {showKeyModal && (
        <ApiKeyModal onSave={handleSaveKey} />
      )}

      {/* Settings modal — update key */}
      {showSettingsKeyModal && (
        <ApiKeyModal
          onSave={handleSaveKey}
          onClose={() => setShowSettingsKeyModal(false)}
          existingKey={currentGroqKey}
        />
      )}
    </div>
  );
}

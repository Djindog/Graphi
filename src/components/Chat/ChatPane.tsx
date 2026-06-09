import { useEffect, useRef, useCallback, useState } from 'react';
import { GitBranch, CircleDot, MousePointerClick } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useDagStore } from '../../stores/dagStore';
import { useGripStore } from '../../stores/gripStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { Tooltip } from '../Tooltip';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { detectReferences, generateTitle } from '../../lib/groq';
import { embedText } from '../../lib/jina';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ContextSummary } from './ContextSummary';
import { BranchReminder } from './BranchReminder';
import type { Message } from '../../types';
import type Groq from 'groq-sdk';

const DEBOUNCE_MS = 500;
const CHAT_SYSTEM_PROMPT =
  'You are a helpful thinking partner. Answer the latest user message, using context only as supporting material when it is relevant. Do not infer a task from context alone. If the latest user message is unclear, nonsensical, random characters, or has no interpretable request, say you cannot tell what they want and ask them to clarify.';

function isLikelyLowIntentInput(text: string): boolean {
  const compact = text.trim().replace(/\s+/g, '');
  if (compact.length <= 1) return true;
  if (/^[ㄱ-ㅎㅏ-ㅣ]+$/.test(compact)) return true;
  if (!/[\p{L}\p{N}]/u.test(compact)) return true;

  const chars = [...compact];
  const mostFrequent = Math.max(...[...new Set(chars)].map(ch => chars.filter(c => c === ch).length));
  if (chars.length >= 4 && mostFrequent / chars.length >= 0.75) return true;

  const latinOnly = /^[a-zA-Z]+$/.test(compact);
  const hasWhitespace = /\s/.test(text.trim());
  const vowelCount = (compact.match(/[aeiouAEIOU]/g) ?? []).length;
  if (latinOnly && compact.length >= 5 && vowelCount === 0) return true;
  if (latinOnly && compact.length >= 8 && !hasWhitespace && vowelCount / compact.length < 0.18) return true;
  if (/^(asdf|qwer|zxcv|hjkl|fdsa|rewq|vcxz){1,}$/i.test(compact)) return true;

  return false;
}

export function ChatPane({ width = 320, groqClient, canvasHidden = false }: { width?: number; groqClient: InstanceType<typeof Groq> | null; canvasHidden?: boolean }) {
  const [devMode, setDevMode] = useState(() => localStorage.getItem('graphi_dev_mode') === 'true');

  // When dev mode is ON: use lowered threshold; OFF: use production threshold (15)
  const REMINDER_THRESHOLD = devMode
    ? parseInt(import.meta.env.VITE_REMINDER_THRESHOLD || '15', 10)
    : 15;

  const {
    currentNodeId, messages, currentInput,
    referencedNodeIds, recommendedNodeIds, activeContextNodeIds, deactivatedNodeIds,
    isGenerating, setCurrentInput, setReferenced, setRecommended,
    initContext, toggleNodeActive, setIsGenerating, addMessage, clearContext, partialClearContext,
    contextDisplayMode, setContextDisplay, clearAllContext, reinitContext,
    branchReminderDismissed, branchReminderVisible,
    setBranchReminderDismissed, setBranchReminderVisible,
  } = useChatStore();

  const { nodes, getAllAncestors, getNodesByProject, renameNode, getPrevSibling, getNextSibling, addNode, pushNavigationStack, popNavigationStack, getFirstChild } = useDagStore();
  const { gripLevel, setGripLevel, shouldPerformRAG, getMinScore } = useGripStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const contextRoRef = useRef<ResizeObserver | null>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const innerChatPaneRef = useRef<HTMLDivElement>(null);
  const [contextH, setContextH] = useState(0);
  const [sidePopup, setSidePopup] = useState<{ type: 'left' | 'right' | null; y: number; isEdge: boolean }>({ type: null, y: 0, isEdge: false });

  const setCurrentNode = useChatStore(s => s.setCurrentNode);
  const setNavigationTrigger = useCanvasStore(s => s.setNavigationTrigger);

  // Listen for localStorage changes (e.g., from settings modal)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'graphi_dev_mode') {
        setDevMode(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Keyboard shortcuts for tree navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentNodeId) return;

      if (e.ctrlKey || e.metaKey) {
        const currentNode = nodes.find(n => n.id === currentNodeId);
        if (!currentNode) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (e.shiftKey) {
            // Ctrl+Shift+Down: Create new child
            (async () => {
              const newChild = await addNode(null, currentNodeId, currentNode.projectId);
              setNavigationTrigger('button');
              await setCurrentNode(newChild.id);
            })();
          } else {
            // Ctrl+Down: Pop from stack, or go to first child if stack is empty
            const nodesToReturn = popNavigationStack();
            setNavigationTrigger('arrow');
            if (nodesToReturn) {
              setCurrentNode(nodesToReturn);
            } else {
              const firstChild = getFirstChild(currentNodeId);
              if (firstChild) {
                setCurrentNode(firstChild.id);
              }
            }
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = getPrevSibling(currentNodeId);
          setNavigationTrigger('arrow');
          if (prev) {
            setCurrentNode(prev.id);
          } else {
            // Create new sibling
            (async () => {
              const newSibling = await addNode(null, currentNode.parentId, currentNode.projectId);
              await setCurrentNode(newSibling.id);
            })();
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const next = getNextSibling(currentNodeId);
          setNavigationTrigger('arrow');
          if (next) {
            setCurrentNode(next.id);
          } else {
            // Create new sibling
            (async () => {
              const newSibling = await addNode(null, currentNode.parentId, currentNode.projectId);
              await setCurrentNode(newSibling.id);
            })();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          // Ctrl+Up: Push current node to stack, then navigate to parent
          if (currentNode.parentId) {
            setNavigationTrigger('arrow');
            pushNavigationStack(currentNodeId);
            setCurrentNode(currentNode.parentId);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNodeId, nodes, getPrevSibling, getNextSibling, addNode, pushNavigationStack, popNavigationStack, getFirstChild, setCurrentNode, setNavigationTrigger]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const container = innerChatPaneRef.current;
    if (!container || !currentNodeId) {
      setSidePopup({ type: null, y: 0, isEdge: false });
      return;
    }

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const containerHeight = rect.height;
    const chatInputHeight = 70;

    if (y > containerHeight - chatInputHeight) {
      setSidePopup({ type: null, y: 0, isEdge: false });
      return;
    }

    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) return;

    if (x >= 0 && x <= 50) {
      const hasPrev = !!getPrevSibling(currentNodeId);
      setSidePopup({ type: 'left', y, isEdge: !hasPrev });
      return;
    }

    if (x >= rect.width - 50 && x <= rect.width) {
      const hasNext = !!getNextSibling(currentNodeId);
      setSidePopup({ type: 'right', y, isEdge: !hasNext });
      return;
    }

    setSidePopup({ type: null, y: 0, isEdge: false });
  }, [currentNodeId, nodes, getPrevSibling, getNextSibling]);

  const handleSideButtonClick = useCallback(async (direction: 'left' | 'right') => {
    if (!currentNodeId) return;

    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) return;

    setNavigationTrigger('button');

    if (direction === 'left') {
      const hasPrev = !!getPrevSibling(currentNodeId);
      if (hasPrev) {
        const prev = getPrevSibling(currentNodeId);
        if (prev) {
          await setCurrentNode(prev.id);
        }
      } else {
        const newSibling = await addNode(null, currentNode.parentId, currentNode.projectId);
        await setCurrentNode(newSibling.id);
      }
    } else {
      const hasNext = !!getNextSibling(currentNodeId);
      if (hasNext) {
        const next = getNextSibling(currentNodeId);
        if (next) {
          await setCurrentNode(next.id);
        }
      } else {
        const newSibling = await addNode(null, currentNode.parentId, currentNode.projectId);
        await setCurrentNode(newSibling.id);
      }
    }
  }, [currentNodeId, nodes, getPrevSibling, getNextSibling, addNode, setCurrentNode, setNavigationTrigger]);

  useEffect(() => {
    const container = innerChatPaneRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove as EventListener);
    const handleLeave = () => setSidePopup({ type: null, y: 0, isEdge: false });
    container.addEventListener('mouseleave', handleLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove as EventListener);
      container.removeEventListener('mouseleave', handleLeave);
    };
  }, [handleMouseMove]);

  const getSideTooltipText = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      return sidePopup.type === 'left' ? (sidePopup.isEdge ? 'New sibling' : 'Previous sibling') : '';
    } else {
      return sidePopup.type === 'right' ? (sidePopup.isEdge ? 'New sibling' : 'Next sibling') : '';
    }
  };

  const contextCardRef = useCallback((el: HTMLDivElement | null) => {
    contextRoRef.current?.disconnect();
    if (!el) { setContextH(0); return; }
    const ro = new ResizeObserver(() => setContextH(el.offsetHeight));
    ro.observe(el);
    setContextH(el.offsetHeight);
    contextRoRef.current = ro;
  }, []);
  const currentNode = nodes.find(n => n.id === currentNodeId) ?? null;

  useEffect(() => {
    if (!currentNodeId) return;
    const ancestors = getAllAncestors(currentNodeId);
    initContext(ancestors.map(a => a.id));
  }, [currentNodeId, getAllAncestors, initContext]);

  // Remedy 2: Show branch reminder when threshold is hit
  useEffect(() => {
    const messageCount = messages.length;
    const shouldShowReminder = messageCount >= REMINDER_THRESHOLD && !branchReminderDismissed;

    if (shouldShowReminder && messageCount === REMINDER_THRESHOLD) {
      setBranchReminderVisible(true);
    }
  }, [messages.length, branchReminderDismissed, setBranchReminderVisible, REMINDER_THRESHOLD]);

  const runStage0 = useCallback(async (message: string) => {
    if (!currentNodeId || !message.trim()) { clearContext(); return; }
    if (isLikelyLowIntentInput(message)) { clearContext(); return; }
    const projectId = currentNode?.projectId;
    if (!projectId) return;
    const projectNodes = getNodesByProject(projectId);

    const [referenced, recommended] = await Promise.all([
      (groqClient ? detectReferences(message, projectNodes, groqClient) : Promise.resolve([] as string[])).catch(() => [] as string[]),
      shouldPerformRAG()
        ? (async () => {
            try {
              const embedding = await embedText(message);
              const minScore = getMinScore();
              const matchCount = { off: 0, low: 15, mid: 8, high: 3 }[gripLevel];
              const { data } = await supabase.rpc('search_nodes', {
                query_embedding: embedding, match_threshold: minScore,
                match_count: matchCount, project_id: projectId,
              });
              return ((data || []) as { id: string }[]).map(d => d.id);
            } catch { return [] as string[]; }
          })()
        : Promise.resolve([] as string[]),
    ]);
    setReferenced(referenced);
    setRecommended(recommended);
  }, [currentNodeId, currentNode, getNodesByProject, shouldPerformRAG, getMinScore, gripLevel, setReferenced, setRecommended, clearContext, groqClient]);

  const handleInputChange = (text: string) => {
    setCurrentInput(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { partialClearContext(); return; }
    debounceRef.current = setTimeout(() => runStage0(text), DEBOUNCE_MS);
  };

  const handleEditSend = useCallback(async (id: string, newContent: string) => {
    if (!newContent.trim() || !currentNodeId || isGenerating || !groqClient) return;
    const editIdx = useChatStore.getState().messages.findIndex(m => m.id === id);
    if (editIdx !== -1) {
      const toDelete = useChatStore.getState().messages.slice(editIdx);
      await Promise.all(toDelete.map(m => supabase.from('messages').delete().eq('id', m.id)));
      useChatStore.setState(s => ({ messages: s.messages.slice(0, editIdx) }));
    }
    handleSendWithContent(newContent.trim());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId, isGenerating, groqClient]);

  const handleSend = async () => {
    if (!currentInput.trim() || !currentNodeId || isGenerating || !groqClient) return;
    const userMessage = currentInput.trim();
    setCurrentInput('');
    handleSendWithContent(userMessage);
  };

  const handleSendWithContent = async (userMessage: string) => {
    if (!currentNodeId || !groqClient) return;
    setIsGenerating(true);
    const abort = new AbortController();
    abortRef.current = abort;

    const userMsg: Message = { id: uuidv4(), nodeId: currentNodeId, role: 'user', content: userMessage, createdAt: new Date().toISOString() };
    addMessage(userMsg);

    const lowIntentInput = isLikelyLowIntentInput(userMessage);
    const contextNodeIds = lowIntentInput ? [] : activeContextNodeIds;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const ancestors = getAllAncestors(currentNodeId);

    const fmt = (ids: string[]) => ids.filter(id => contextNodeIds.includes(id))
      .map(id => nodeMap.get(id)).filter(Boolean)
      .map(n => `[${n!.title || 'Untitled'}]\n${n!.content || ''}`).join('\n---\n');

    const lineageContent = fmt(ancestors.map(n => n.id));
    const referencedContent = fmt(referencedNodeIds);
    const recommendedContent = fmt(recommendedNodeIds);

    const parts = [];
    if (lineageContent) parts.push(`Context from lineage:\n${lineageContent}`);
    if (referencedContent) parts.push(`Referenced nodes:\n${referencedContent}`);
    if (recommendedContent) parts.push(`Related nodes:\n${recommendedContent}`);
    const userPrompt = lowIntentInput
      ? `The latest user message appears unclear or meaningless. Do not answer from context or previous conversation. Ask the user to clarify what they want.\n\nLatest user message:\n${userMessage}`
      : parts.length
      ? `Latest user message:\n${userMessage}\n\nAvailable context, use only if relevant to the latest user message:\n${parts.join('\n\n')}`
      : userMessage;

    const historyMsgs = lowIntentInput ? [] : useChatStore.getState().messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const assistantMsgId = uuidv4();
    addMessage({ id: assistantMsgId, nodeId: currentNodeId, role: 'assistant', content: '', createdAt: new Date().toISOString() });

    let fullResponse = '';
    try {
      const stream = await groqClient.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: CHAT_SYSTEM_PROMPT },
          ...historyMsgs,
          { role: 'user', content: userPrompt },
        ],
        stream: true, max_tokens: 2048,
      }, { signal: abort.signal });

      // Batch state updates to rAF cadence (~60fps) so rapid token chunks
      // don't trigger a React re-render per token.
      let rafScheduled = false;
      const flush = () => {
        rafScheduled = false;
        const current = fullResponse;
        useChatStore.setState(s => ({
          messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content: current } : m),
        }));
      };
      for await (const chunk of stream) {
        fullResponse += chunk.choices[0]?.delta?.content || '';
        if (!rafScheduled) {
          rafScheduled = true;
          requestAnimationFrame(flush);
        }
      }
      // Final flush in case the last frame hasn't fired yet
      flush();

      await supabase.from('messages').insert([
        { id: userMsg.id, nodeId: currentNodeId, role: 'user', content: userMessage, createdAt: userMsg.createdAt },
        { id: assistantMsgId, nodeId: currentNodeId, role: 'assistant', content: fullResponse, createdAt: new Date().toISOString() },
      ]);

      const isFirst = messages.filter(m => m.role === 'user').length === 0;
      if (isFirst && !lowIntentInput) {
        const title = await generateTitle(userMessage, fullResponse, groqClient);
        await renameNode(currentNodeId, title);
      }

      const node = nodeMap.get(currentNodeId);
      await supabase.from('snapshots').insert({
        id: uuidv4(), nodeId: currentNodeId, version: node?.version ?? 1,
        content: fullResponse, prompt: userMessage, parentNodeId: node?.parentId ?? null,
        referencedNodeIds, recommendedNodeIds, activeContext: contextNodeIds,
        deactivatedNodes: deactivatedNodeIds, model: 'llama-3.1-8b-instant',
        generatedAt: new Date().toISOString(),
      });

      await useDagStore.getState().updateNodeContent(currentNodeId, fullResponse);
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (!isAbort) {
        const status = (err as { status?: number })?.status;
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        const isRateLimit = status === 429 || msg.includes('rate limit') || msg.includes('429');
        const isAuth = status === 401 || msg.includes('invalid api key') || msg.includes('unauthorized') || msg.includes('authentication');
        const isNetwork = err instanceof TypeError && (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch'));
        const content = isRateLimit
          ? 'Rate limit reached. Check your usage at [console.groq.com](https://console.groq.com).'
          : isAuth
          ? 'Invalid API key. Update it in Settings (gear icon).'
          : isNetwork
          ? 'Could not reach Groq — check your internet connection and try again.'
          : 'Error generating response.';
        useChatStore.setState(s => ({
          messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content } : m),
        }));
      }
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
      partialClearContext();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const allContextIds = [...new Set([...activeContextNodeIds, ...deactivatedNodeIds])];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const ancestors = currentNodeId ? getAllAncestors(currentNodeId) : [];

  if (!currentNodeId) {
    return (
      <div style={{ ...(canvasHidden ? { flex: 1 } : { width, flexShrink: 0 }), background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={{ color: '#D1D5DB', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <MousePointerClick size={32} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Select a node</p>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Click any node on the canvas to open its thread.</p>
        </div>
      </div>
    );
  }

  const isRoot = !currentNode?.parentId;

  return (
    <div style={{ ...(canvasHidden ? { flex: 1 } : { width, flexShrink: 0 }), background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header — full pane width */}
      <div style={{ padding: '15px 16px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isRoot
            ? <CircleDot size={15} strokeWidth={2} color="#2563EB" />
            : <GitBranch size={15} strokeWidth={2} color="#2563EB" />}
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0, letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentNode?.title || 'Untitled'}
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>
            {isRoot ? 'Root thread' : 'Branch thread'}
          </p>
        </div>
        {/* Remedy 1: Message count with tooltip */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.875rem',
              color: messages.length >= REMINDER_THRESHOLD ? 'rgb(78, 70, 0)' : 'rgb(107, 114, 128)',
              backgroundColor: messages.length >= REMINDER_THRESHOLD ? 'rgb(255, 251, 235)' : 'transparent',
              padding: messages.length >= REMINDER_THRESHOLD ? '0.25rem 0.75rem' : '0',
              borderRadius: '0.375rem',
              fontWeight: messages.length >= REMINDER_THRESHOLD ? 500 : 400,
              cursor: messages.length >= REMINDER_THRESHOLD ? 'pointer' : 'default',
              transition: 'background-color 0.3s ease, color 0.3s ease',
              position: 'relative',
              whiteSpace: 'nowrap',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => {
              if (messages.length >= REMINDER_THRESHOLD) {
                e.currentTarget.style.backgroundColor = 'rgb(254, 243, 199)';
                const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                if (tooltip) tooltip.style.display = 'block';
              }
            }}
            onMouseLeave={(e) => {
              if (messages.length >= REMINDER_THRESHOLD) {
                e.currentTarget.style.backgroundColor = 'rgb(255, 251, 235)';
                const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                if (tooltip) tooltip.style.display = 'none';
              }
            }}
          >
            {messages.length >= REMINDER_THRESHOLD ? `${REMINDER_THRESHOLD}+ messages` : `${messages.length} messages`}
          </span>
          {messages.length >= REMINDER_THRESHOLD && (
            <div
              style={{
                display: 'none',
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                zIndex: 50,
                pointerEvents: 'none',
              }}
            >
              {REMINDER_THRESHOLD}+ messages — branch this node
            </div>
          )}
          {devMode && (
            <button
              onClick={() => setBranchReminderVisible(true)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                background: 'rgb(239, 68, 68)',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontWeight: 500,
                opacity: 0.7,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
              title="Dev: Trigger reminder"
            >
              Test
            </button>
          )}
        </div>
      </div>

      {/* Content area — scrollable, centered content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', justifyContent: 'center', background: '#fff' }}>
        {/* InnerChatPane — centered container with max-width 720px */}
        <div ref={innerChatPaneRef} style={{ width: '100%', maxWidth: 720, minHeight: 0, display: 'flex', flexDirection: 'column', paddingLeft: 16, paddingRight: 16, position: 'relative', overflowY: 'auto' }}>

          {/* Messages area */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Remedy 2: Branch Reminder Bar (inside message list container) */}
            <BranchReminder
              isVisible={branchReminderVisible}
              messageCount={messages.length}
              onClose={() => setBranchReminderVisible(false)}
              onDismiss={() => {
                setBranchReminderVisible(false);
                setBranchReminderDismissed(true);
              }}
              threshold={REMINDER_THRESHOLD}
              contextHeight={contextH}
            />

            <MessageList
              messages={messages}
              isGenerating={isGenerating}
              contextPadding={allContextIds.length > 0 ? contextH + 8 : 0}
              scrollContainerRef={messageScrollRef}
              onEditMessage={handleEditSend}
            />

            {/* Blur gradient just below the context panel */}
            {allContextIds.length > 0 && contextH > 0 && (
              <div style={{
                position: 'absolute', top: contextH, left: 0, right: 0, height: 24,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.85), transparent)',
                pointerEvents: 'none', zIndex: 8,
              }} />
            )}

            {/* Context panel — U-shape, hangs from top */}
            {allContextIds.length > 0 && (
              <div
                ref={contextCardRef}
                style={{
                  position: 'absolute', top: 0,
                  left: '50%', transform: 'translateX(-50%)',
                  width: 'calc(100% - 16px)',
                  zIndex: 10,
                }}
                onWheel={e => { messageScrollRef.current?.scrollBy({ top: e.deltaY }); }}
              >
                <ContextSummary
                  ancestors={ancestors}
                  referencedIds={referencedNodeIds}
                  recommendedIds={recommendedNodeIds}
                  activeIds={activeContextNodeIds}
                  nodeMap={nodeMap}
                  onToggle={toggleNodeActive}
                  onClearAll={clearAllContext}
                  onReinit={reinitContext}
                />
              </div>
            )}
          </div>

          {/* Chat input */}
          <div style={{ flexShrink: 0 }}>
            <ChatInput
              value={currentInput}
              onChange={handleInputChange}
              onSend={handleSend}
              onStop={handleStop}
              isGenerating={isGenerating}
              gripLevel={gripLevel}
              onGripChange={setGripLevel}
              onInputFocus={() => setContextDisplay(true)}
              onInputBlur={() => { if (!contextDisplayMode) setContextDisplay(false); }}
            />
          </div>

          {/* Left side button with tooltip */}
          {sidePopup.type === 'left' && (
            <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 40 }}>
              <Tooltip placement="right" width={110} content={getSideTooltipText('left')} triangle>
                <button
                  onClick={() => handleSideButtonClick('left')}
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    border: '1px solid #E5E7EB', background: '#fff', color: '#374151',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#111827';
                    e.currentTarget.style.color = '#111827';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.12)';
                  }}
                >
                  {sidePopup.isEdge ? <Plus size={16} strokeWidth={2.5} /> : <ArrowLeft size={16} strokeWidth={2.5} />}
                </button>
              </Tooltip>
            </div>
          )}

          {/* Right side button with tooltip */}
          {sidePopup.type === 'right' && (
            <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 40 }}>
              <Tooltip placement="left" width={110} content={getSideTooltipText('right')} triangle>
                <button
                  onClick={() => handleSideButtonClick('right')}
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    border: '1px solid #E5E7EB', background: '#fff', color: '#374151',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#111827';
                    e.currentTarget.style.color = '#111827';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.color = '#374151';
                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.12)';
                  }}
                >
                  {sidePopup.isEdge ? <Plus size={16} strokeWidth={2.5} /> : <ArrowRight size={16} strokeWidth={2.5} />}
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useCallback, useState } from 'react';
import { GitBranch, CircleDot, MousePointerClick } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useDagStore } from '../../stores/dagStore';
import { useGripStore } from '../../stores/gripStore';
import { useTutorialStore } from '../../stores/tutorialStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { Tooltip } from '../Tooltip';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { detectReferences, detectReferencesAndDrift, generateTitle } from '../../lib/groq';
import { supabase } from '../../lib/supabase';
import { generateSummaryText, updateNodeSummary } from '../../lib/summaryManagement';
import { v4 as uuidv4 } from 'uuid';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ContextSummary } from './ContextSummary';
import type { Message } from '../../types';
import type Groq from 'groq-sdk';

const DEBOUNCE_MS = 1000;

const TUTORIAL_WHAT_IS_GRAPHI =
`Graphi is a tree-based thinking tool for exploratory conversations.

Unlike a regular chat that flows in one long thread, Graphi lets you **branch** off at any point — creating separate conversation threads that share a common ancestor. Each **node** in the tree holds its own chat history.

**Key concepts:**
- **Root node** — your starting point. Every project begins here.
- **Branches** — child nodes that let you explore a topic from a different angle without losing your original thread.
- **Context** — you decide which nodes the AI can see when generating a response, so you can mix and match history across branches.

This structure makes Graphi ideal for research, writing, brainstorming, and any task where you want to explore multiple directions without cluttering a single chat.

The tutorial will now walk you through creating branches, managing context, and navigating your tree!`;

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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const prevNodeIdRef = useRef<string | null>(null);

  // When dev mode is ON: use lowered threshold; OFF: use production threshold (15)
  const REMINDER_THRESHOLD = devMode
    ? parseInt(import.meta.env.VITE_REMINDER_THRESHOLD || '15', 10)
    : 15;

  const {
    currentNodeId, messages, currentInput,
    referencedNodeIds, recommendedNodeIds, activeContextNodeIds, deactivatedNodeIds,
    lockedActiveIds, lockedDeactivatedIds,
    isGenerating, setCurrentInput, setReferenced, setRecommended,
    initContext, toggleNodeActive, toggleLock, lockAll, unlockAll,
    setIsGenerating, addMessage, clearContext, partialClearContext,
    contextDisplayMode, setContextDisplay, clearAllContext, reinitContext,
    branchReminderDismissed,
    setBranchReminderDismissed,
    guidanceEnabled, setGuidanceEnabled, referenceDetectionEnabled, driftDetectionEnabled, driftDetected, suggestedNodeId, setDriftDetected, setSuggestedNodeId,
    devShowGuidancePill, setDevShowGuidancePill,
    setHoveredSuggestedNodeId,
  } = useChatStore();

  const { nodes, getAllAncestors, getNodesByProject, renameNode, getPrevSibling, getNextSibling, addNode, pushNavigationStack, popNavigationStack, getFirstChild } = useDagStore();
  const { setGripLevel } = useGripStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const contextRoRef = useRef<ResizeObserver | null>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const innerChatPaneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageListRef = useRef<{ scrollToBottom: () => void }>(null);
  const [contextH, setContextH] = useState(0);
  const [sidePopup, setSidePopup] = useState<{ type: 'left' | 'right' | null; y: number; isEdge: boolean }>({ type: null, y: 0, isEdge: false });
  const [stage0InProgress, setStage0InProgress] = useState(false);
  const [paneToast, setPaneToast] = useState<string | null>(null);
  const paneToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showPaneToast = (msg: string) => {
    setPaneToast(msg);
    if (paneToastTimer.current) clearTimeout(paneToastTimer.current);
    paneToastTimer.current = setTimeout(() => setPaneToast(null), 2000);
  };
  const [contextPanelVisible, setContextPanelVisible] = useState(true);

  const setCurrentNode = useChatStore(s => s.setCurrentNode);
  const setNavigationTrigger = useCanvasStore(s => s.setNavigationTrigger);

  // Determine guidance pill visibility and type
  const messageCount = messages.length;
  const showRemedy2 = guidanceEnabled && messageCount >= REMINDER_THRESHOLD && !driftDetected && !branchReminderDismissed;
  const showRemedy3 = guidanceEnabled && driftDetected && suggestedNodeId && suggestedNodeId !== currentNodeId;
  const showRemedy4 = guidanceEnabled && driftDetected && !suggestedNodeId && !branchReminderDismissed;
  const showGuidancePill = showRemedy2 || showRemedy3 || showRemedy4 || devShowGuidancePill;
  const noGuidanceNeeded = devShowGuidancePill && !showRemedy2 && !showRemedy3 && !showRemedy4;
  const pillType = showRemedy3 ? 'drift' : showRemedy4 ? 'driftNoNode' : noGuidanceNeeded ? 'noGuidance' : 'length' as const;
  const suggestedNode = suggestedNodeId ? nodes.find(n => n.id === suggestedNodeId) : null;

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
            if (currentNode.isOrphan) {
              showPaneToast('Orphans cannot be branched');
              return;
            }
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
          if (e.shiftKey) {
            // Ctrl+Shift+Left: Create new sibling to the left (before current)
            (async () => {
              const newSibling = await addNode(null, currentNode.parentId, currentNode.projectId, null, currentNodeId);
              await setCurrentNode(newSibling.id);
            })();
          } else {
            // Ctrl+Left: Navigate to previous sibling (do nothing if none)
            const prev = getPrevSibling(currentNodeId);
            if (prev) {
              setCurrentNode(prev.id);
            }
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (e.shiftKey) {
            // Ctrl+Shift+Right: Create new sibling to the right (after current)
            (async () => {
              const newSibling = await addNode(null, currentNode.parentId, currentNode.projectId, currentNodeId);
              await setCurrentNode(newSibling.id);
            })();
          } else {
            // Ctrl+Right: Navigate to next sibling (do nothing if none)
            const next = getNextSibling(currentNodeId);
            if (next) {
              setCurrentNode(next.id);
            }
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
    const node = nodes.find(n => n.id === currentNodeId);
    if (node?.isOrphan) { initContext([]); return; }
    const ancestors = getAllAncestors(currentNodeId);
    initContext(ancestors.map(a => a.id));
  }, [currentNodeId, nodes, getAllAncestors, initContext]);

  useEffect(() => {
    if (currentNodeId && prevNodeIdRef.current && currentNodeId !== prevNodeIdRef.current) {
      setIsLoadingMessages(true);
      const timer = setTimeout(() => setIsLoadingMessages(false), 200);
      return () => clearTimeout(timer);
    }
    prevNodeIdRef.current = currentNodeId;
  }, [currentNodeId]);

  useEffect(() => {
    if (!isGenerating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isGenerating]);

  const runStage0 = useCallback(async (message: string) => {
    if (!currentNodeId || !message.trim()) { clearContext(); setDriftDetected(false); setSuggestedNodeId(null); return; }
    if (isLikelyLowIntentInput(message)) { clearContext(); setDriftDetected(false); setSuggestedNodeId(null); return; }
    const projectId = currentNode?.projectId;
    if (!projectId) return;
    const projectNodes = getNodesByProject(projectId);

    setStage0InProgress(true);
    try {
      const hasEnoughMessages = messages.length >= 4;
      const shouldDetectDrift = driftDetectionEnabled && hasEnoughMessages;
      const shouldDetectReferences = referenceDetectionEnabled;

      if (shouldDetectDrift && groqClient) {
        // Full Stage 0: detect both references and drift
        const { referencedNodeIds, driftDetected, suggestedNodeId } = await detectReferencesAndDrift(
          message,
          projectNodes,
          currentNode?.summary || '',
          currentNodeId,
          groqClient
        );

        setReferenced(referencedNodeIds);
        setDriftDetected(driftDetected);
        setSuggestedNodeId(suggestedNodeId);
      } else if (shouldDetectReferences && groqClient) {
        // Light Stage 0: only detect references (skip drift check)
        const referencedNodeIds = await detectReferences(message, projectNodes, groqClient);

        setReferenced(referencedNodeIds);
        setDriftDetected(false);
        setSuggestedNodeId(null);
      } else {
        // No detection enabled
        setReferenced([]);
        setDriftDetected(false);
        setSuggestedNodeId(null);
      }

      // Keep RAG disabled for now (not calling embedText/search_nodes)
      setRecommended([]);
    } catch (err) {
      console.error('Stage 0 error:', err);
      setReferenced([]);
      setDriftDetected(false);
      setSuggestedNodeId(null);
      setRecommended([]);
    } finally {
      setStage0InProgress(false);
    }
  }, [currentNodeId, currentNode, messages.length, getNodesByProject, setReferenced, setRecommended, setDriftDetected, setSuggestedNodeId, clearContext, groqClient]);

  const handleInputChange = (text: string) => {
    setCurrentInput(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      partialClearContext();
      setDriftDetected(false);
      setSuggestedNodeId(null);
      setHoveredSuggestedNodeId(null);
      return;
    }
    debounceRef.current = setTimeout(() => runStage0(text), DEBOUNCE_MS);
  };

  const handleMoveToNode = useCallback((targetNodeId: string) => {
    const draft = currentInput.trim();
    if (!draft) return;
    setCurrentInput('');
    setCurrentNode(targetNodeId);
    setDriftDetected(false);
    setSuggestedNodeId(null);
    setTimeout(() => {
      setCurrentInput(draft);
    }, 0);
  }, [currentInput, setCurrentInput, setCurrentNode, setDriftDetected, setSuggestedNodeId]);

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

  const handleTutorialSend = async (userMessage: string) => {
    if (!currentNodeId) return;
    setIsGenerating(true);

    const userMsg: Message = {
      id: uuidv4(), nodeId: currentNodeId, role: 'user',
      content: userMessage, createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);

    const assistantMsgId = uuidv4();
    addMessage({ id: assistantMsgId, nodeId: currentNodeId, role: 'assistant', content: '', createdAt: new Date().toISOString() });

    // Simulate streaming: reveal ~5 chars every 15 ms
    const response = TUTORIAL_WHAT_IS_GRAPHI;
    const CHUNK = 5;
    for (let i = CHUNK; i <= response.length; i += CHUNK) {
      await new Promise(r => setTimeout(r, 15));
      const partial = response.slice(0, i);
      useChatStore.setState(s => ({
        messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content: partial } : m),
      }));
    }
    useChatStore.setState(s => ({
      messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content: response } : m),
    }));

    await supabase.from('messages').insert([
      { id: userMsg.id, nodeId: currentNodeId, role: 'user', content: userMessage, createdAt: userMsg.createdAt },
      { id: assistantMsgId, nodeId: currentNodeId, role: 'assistant', content: response, createdAt: new Date().toISOString() },
    ]);
    await renameNode(currentNodeId, 'What is Graphi?');

    // Update summary text every 4 messages (2 back-and-forths)
    const allMessages = useChatStore.getState().messages.filter(m => m.nodeId === currentNodeId);
    if (allMessages.length % 4 === 0) {
      generateSummaryText(allMessages, groqClient)
        .then(summaryText => {
          if (summaryText) return updateNodeSummary(currentNodeId, summaryText);
        })
        .catch(err => console.error('Summary generation error:', err));
    }

    setIsGenerating(false);
    partialClearContext();
  };

  const handleSend = async () => {
    if (!currentInput.trim() || !currentNodeId || isGenerating) return;
    const userMessage = currentInput.trim();

    // Tutorial input validation
    const tutStore = useTutorialStore.getState();
    if (tutStore.isActive) {
      const tutStep = tutStore.currentStepId();
      if (tutStep === 'type-question') {
        if (userMessage !== 'What is Graphi?') {
          tutStore.setInputError('Please type exactly: "What is Graphi?"');
          return;
        }
        tutStore.setInputError(null);
        tutStore.advance();
        setCurrentInput('');
        messageListRef.current?.scrollToBottom();
        handleTutorialSend(userMessage);
        return;
      }
    }

    if (!groqClient) return;

    // Force Stage 0 to run immediately (clear debounce and execute)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Run Stage 0 synchronously before sending
    await runStage0(userMessage);

    setCurrentInput('');
    messageListRef.current?.scrollToBottom();
    handleSendWithContent(userMessage);
  };

  const handleSendWithContent = async (userMessage: string) => {
    if (!currentNodeId || !groqClient) return;
    setIsGenerating(true);
    const abort = new AbortController();
    abortRef.current = abort;

    const previousMessages = useChatStore.getState().messages;
    const userMsg: Message = { id: uuidv4(), nodeId: currentNodeId, role: 'user', content: userMessage, createdAt: new Date().toISOString() };
    addMessage(userMsg);

    const lowIntentInput = isLikelyLowIntentInput(userMessage);
    const contextNodeIds = lowIntentInput ? [] : activeContextNodeIds;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const isCurrentNodeOrphan = !!nodeMap.get(currentNodeId)?.isOrphan;
    const ancestors = isCurrentNodeOrphan ? [] : getAllAncestors(currentNodeId);

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

    const historyMsgs = lowIntentInput ? [] : previousMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

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

      // Update summary text every 4 messages (2 back-and-forths)
      const allMessages = useChatStore.getState().messages.filter(m => m.nodeId === currentNodeId);
      if (allMessages.length % 4 === 0) {
        generateSummaryText(allMessages, groqClient)
          .then(summaryText => {
            if (summaryText) return updateNodeSummary(currentNodeId, summaryText);
          })
          .catch(err => console.error('Summary generation error:', err));
      }
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
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Click any node on the canvas to open it.</p>
        </div>
      </div>
    );
  }

  const isRoot = !currentNode?.parentId;

  return (
    <div style={{ ...(canvasHidden ? { flex: 1 } : { width, flexShrink: 0 }), background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Pane-level toast */}
      {paneToast && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: '#111827', color: '#fff',
          padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          pointerEvents: 'none', whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {paneToast}
        </div>
      )}
      {/* Header — full pane width */}
      <div style={{ padding: '15px 16px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        {/* Pill perched on header bottom edge when panel is closed */}
        {allContextIds.length > 0 && !contextPanelVisible && (
          <button
            title="Expand context"
            onClick={() => setContextPanelVisible(true)}
            style={{
              position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
              zIndex: 30, width: 36, height: 16, padding: 0, border: 'none',
              borderRadius: 999,
              background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.07)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'; }}
          />
        )}
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
              color: messages.length >= REMINDER_THRESHOLD ? 'rgb(120, 53, 15)' : 'rgb(107, 114, 128)',
              backgroundColor: messages.length >= REMINDER_THRESHOLD ? 'rgb(254, 243, 199)' : 'transparent',
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
                e.currentTarget.style.backgroundColor = 'rgb(253, 230, 138)';
                const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                if (tooltip) tooltip.style.display = 'block';
              }
            }}
            onMouseLeave={(e) => {
              if (messages.length >= REMINDER_THRESHOLD) {
                e.currentTarget.style.backgroundColor = 'rgb(254, 243, 199)';
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
              onClick={() => {
                setDevShowGuidancePill(!devShowGuidancePill);
              }}
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
              title="Dev: Reset reminder / Trigger drift"
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
            <MessageList
              ref={messageListRef}
              messages={messages}
              isGenerating={isGenerating}
              isLoadingMessages={isLoadingMessages}
              contextPadding={0}
              scrollContainerRef={messageScrollRef}
              onEditMessage={handleEditSend}
              guidancePillVisible={Boolean(showGuidancePill)}
              guidancePillType={pillType}
              suggestedNodeTitle={suggestedNode?.title ?? suggestedNodeId ?? undefined}
              suggestedNodeId={suggestedNodeId ?? undefined}
              onMoveToNode={handleMoveToNode}
              onDismissGuidance={() => {
                setBranchReminderDismissed(true);
              }}
              onHoverSuggestedNode={setHoveredSuggestedNodeId}
              isOrphan={!!currentNode?.isOrphan}
            />

            {/* Context panel — floats from top */}
            {allContextIds.length > 0 && (
              <div
                ref={contextCardRef}
                style={{
                  position: 'absolute', top: 0,
                  left: '50%', transform: 'translateX(-50%)',
                  width: 'calc(100% - 16px)',
                  zIndex: 10,
                  display: contextPanelVisible ? 'block' : 'none',
                }}
                onWheel={e => { messageScrollRef.current?.scrollBy({ top: e.deltaY }); }}
              >
                <ContextSummary
                  ancestors={ancestors}
                  referencedIds={referencedNodeIds}
                  recommendedIds={recommendedNodeIds}
                  activeIds={activeContextNodeIds}
                  lockedActiveIds={lockedActiveIds}
                  lockedDeactivatedIds={lockedDeactivatedIds}
                  nodeMap={nodeMap}
                  onToggle={toggleNodeActive}
                  onToggleLock={toggleLock}
                  onLockAll={lockAll}
                  onUnlockAll={unlockAll}
                  onClearAll={clearAllContext}
                  onReinit={reinitContext}
                  currentNode={currentNodeId ? nodeMap.get(currentNodeId) ?? null : null}
                  messages={messages}
                  groqClient={groqClient}
                />
              </div>
            )}

            {/* Toggle pill — sits on bottom edge of panel when open or partial */}
            {allContextIds.length > 0 && contextPanelVisible && (
              <button
                title="Collapse"
                onClick={() => setContextPanelVisible(false)}
                style={{
                  position: 'absolute',
                  top: contextH - 8,
                  left: '50%', transform: 'translateX(-50%)',
                  zIndex: 20,
                  width: 36, height: 16, padding: 0, border: 'none',
                  borderRadius: 999,
                  background: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.07)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'; }}
              />
            )}
          </div>

          {/* Chat input */}
          <div style={{ flexShrink: 0 }}>
            <ChatInput
              ref={inputRef}
              value={currentInput}
              onChange={handleInputChange}
              onSend={handleSend}
              onStop={handleStop}
              isGenerating={isGenerating}
              guidanceEnabled={guidanceEnabled}
              stage0InProgress={stage0InProgress}
              onGuidanceChange={(enabled) => {
                setGuidanceEnabled(enabled);
                if (!enabled) {
                  setGripLevel('off');
                }
              }}
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
                    border: '1px solid #E5E7EB', background: sidePopup.isEdge ? '#F0F9FF' : '#fff', color: sidePopup.isEdge ? '#2563EB' : '#374151',
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
                    e.currentTarget.style.color = sidePopup.isEdge ? '#2563EB' : '#374151';
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
                    border: '1px solid #E5E7EB', background: sidePopup.isEdge ? '#F0F9FF' : '#fff', color: sidePopup.isEdge ? '#2563EB' : '#374151',
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
                    e.currentTarget.style.color = sidePopup.isEdge ? '#2563EB' : '#374151';
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

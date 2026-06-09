import { useEffect, useRef, useCallback, useState } from 'react';
import { GitBranch, CircleDot, MousePointerClick } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useDagStore } from '../../stores/dagStore';
import { useGripStore } from '../../stores/gripStore';
import { detectReferences, generateTitle } from '../../lib/groq';
import { embedText } from '../../lib/jina';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ContextSummary } from './ContextSummary';
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
  const {
    currentNodeId, messages, currentInput,
    referencedNodeIds, recommendedNodeIds, activeContextNodeIds, deactivatedNodeIds,
    isGenerating, setCurrentInput, setReferenced, setRecommended,
    initContext, toggleNodeActive, setIsGenerating, addMessage, clearContext, partialClearContext,
    contextDisplayMode, setContextDisplay, clearAllContext, reinitContext,
  } = useChatStore();

  const { nodes, getAllAncestors, getNodesByProject, renameNode } = useDagStore();
  const { gripLevel, setGripLevel, shouldPerformRAG, getMinScore } = useGripStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const contextRoRef = useRef<ResizeObserver | null>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const [contextH, setContextH] = useState(0);

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
      </div>

      {/* Content area — scroll spans full pane width so scrollbar is at the screen edge */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Messages area — full pane width, U-shaped context panel hangs from top */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
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

          {/* Context panel — U-shape, hangs from top, centered at 720px */}
          {allContextIds.length > 0 && (
            <div
              ref={contextCardRef}
              style={{
                position: 'absolute', top: 0,
                left: '50%', transform: 'translateX(-50%)',
                width: 'calc(100% - 16px)', maxWidth: 720,
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

        {/* Chat input — centered at 720px */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 720 }}>
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
        </div>
      </div>
    </div>
  );
}

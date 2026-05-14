import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useDagStore } from '../../stores/dagStore';
import { useGripStore } from '../../stores/gripStore';
import { groqClient, detectReferences, generateTitle } from '../../lib/groq';
import { embedText } from '../../lib/jina';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ContextSummary } from './ContextSummary';
import type { Message } from '../../types';

const DEBOUNCE_MS = 500;

export function ChatPane({ width = 320 }: { width?: number }) {
  const {
    currentNodeId, messages, currentInput,
    referencedNodeIds, recommendedNodeIds, activeContextNodeIds, deactivatedNodeIds,
    isGenerating, setCurrentInput, setReferenced, setRecommended,
    initContext, toggleNodeActive, setIsGenerating, addMessage, clearContext,
  } = useChatStore();

  const { nodes, getAllAncestors, getNodesByProject, renameNode } = useDagStore();
  const { gripLevel, setGripLevel, shouldPerformRAG, getMinScore } = useGripStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentNode = nodes.find(n => n.id === currentNodeId) ?? null;

  useEffect(() => {
    if (!currentNodeId) return;
    const ancestors = getAllAncestors(currentNodeId);
    initContext(ancestors.map(a => a.id));
  }, [currentNodeId, getAllAncestors, initContext]);

  const runStage0 = useCallback(async (message: string) => {
    if (!currentNodeId || !message.trim()) { clearContext(); return; }
    const projectId = currentNode?.projectId;
    if (!projectId) return;
    const projectNodes = getNodesByProject(projectId);

    const [referenced, recommended] = await Promise.all([
      detectReferences(message, projectNodes).catch(() => [] as string[]),
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
  }, [currentNodeId, currentNode, getNodesByProject, shouldPerformRAG, getMinScore, gripLevel, setReferenced, setRecommended, clearContext]);

  const handleInputChange = (text: string) => {
    setCurrentInput(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { clearContext(); return; }
    debounceRef.current = setTimeout(() => runStage0(text), DEBOUNCE_MS);
  };

  const handleSend = async () => {
    if (!currentInput.trim() || !currentNodeId || isGenerating) return;
    const userMessage = currentInput.trim();
    setCurrentInput('');
    setIsGenerating(true);

    const userMsg: Message = { id: uuidv4(), nodeId: currentNodeId, role: 'user', content: userMessage, createdAt: new Date().toISOString() };
    addMessage(userMsg);

    const contextNodeIds = activeContextNodeIds;
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
    const userPrompt = parts.length ? `${parts.join('\n\n')}\n\n---\nUser: ${userMessage}` : userMessage;

    const historyMsgs = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const assistantMsgId = uuidv4();
    addMessage({ id: assistantMsgId, nodeId: currentNodeId, role: 'assistant', content: '', createdAt: new Date().toISOString() });

    let fullResponse = '';
    try {
      const stream = await groqClient.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a helpful thinking partner. Consider the context carefully.' },
          ...historyMsgs,
          { role: 'user', content: userPrompt },
        ],
        stream: true, max_tokens: 2048,
      });

      for await (const chunk of stream) {
        fullResponse += chunk.choices[0]?.delta?.content || '';
        useChatStore.setState(s => ({
          messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content: fullResponse } : m),
        }));
      }

      await supabase.from('messages').insert([
        { id: userMsg.id, nodeId: currentNodeId, role: 'user', content: userMessage, createdAt: userMsg.createdAt },
        { id: assistantMsgId, nodeId: currentNodeId, role: 'assistant', content: fullResponse, createdAt: new Date().toISOString() },
      ]);

      const isFirst = messages.filter(m => m.role === 'user').length === 0;
      if (isFirst) {
        const title = await generateTitle(userMessage, fullResponse);
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
    } catch {
      useChatStore.setState(s => ({
        messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content: '[Error generating response]' } : m),
      }));
    } finally {
      setIsGenerating(false);
      clearContext();
    }
  };

  const allContextIds = [...new Set([...activeContextNodeIds, ...deactivatedNodeIds])];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const ancestors = currentNodeId ? getAllAncestors(currentNodeId) : [];

  if (!currentNodeId) {
    return (
      <div style={{ width, background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexShrink: 0 }}>
        <p style={{ color: '#D1D5DB', fontSize: 14 }}>Select a node</p>
      </div>
    );
  }

  return (
    <div style={{ width, background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      {/* Node header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentNode?.title || 'Untitled'}
        </p>
      </div>

      {allContextIds.length > 0 && (
        <ContextSummary
          ancestors={ancestors}
          referencedIds={referencedNodeIds}
          recommendedIds={recommendedNodeIds}
          activeIds={activeContextNodeIds}
          nodeMap={nodeMap}
          onToggle={toggleNodeActive}
        />
      )}

      <MessageList messages={messages} isGenerating={isGenerating} />
      <ChatInput value={currentInput} onChange={handleInputChange} onSend={handleSend} isGenerating={isGenerating} gripLevel={gripLevel} onGripChange={setGripLevel} />
    </div>
  );
}

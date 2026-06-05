import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquarePlus, ArrowDown, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useChatStore } from '../../stores/chatStore';
import { useDagStore } from '../../stores/dagStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { Tooltip } from '../Tooltip';
import type { Message } from '../../types';

interface Props {
  messages: Message[];
  isGenerating: boolean;
  contextPadding?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({ messages, isGenerating, contextPadding = 0, scrollContainerRef }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLDivElement>(null);
  const scrollRef = scrollContainerRef ?? internalRef;
  const outerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showBranchZone, setShowBranchZone] = useState(false);
  const userScrolledUp = useRef(false);

  const { currentNodeId } = useChatStore();
  const { addNode, nodes } = useDagStore();
  const setNavigationTrigger = useCanvasStore(s => s.setNavigationTrigger);

  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = distFromBottom > 400;
    userScrolledUp.current = scrolledUp;
    setShowScrollBtn(scrolledUp);
  };

  const scrollToBottom = () => {
    userScrolledUp.current = false;
    setShowScrollBtn(false);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBranch = useCallback(async () => {
    if (!currentNodeId) return;
    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) return;
    setNavigationTrigger('button');
    const newChild = await addNode(null, currentNodeId, currentNode.projectId);
    await useChatStore.getState().setCurrentNode(newChild.id);
  }, [currentNodeId, nodes, addNode, setNavigationTrigger]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = outerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setShowBranchZone(e.clientY >= rect.bottom - 40);
  };

  return (
    <div
      ref={outerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowBranchZone(false)}
      style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}
    >
      {/* Scroll container spans full pane width — scrollbar appears at screen right edge */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        {/* Content centered at 720px inside the full-width scroll */}
        <div style={{
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
          flex: 1,
          paddingTop: contextPadding > 0 ? contextPadding : 18,
          paddingBottom: 18,
          paddingLeft: 16,
          paddingRight: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxSizing: 'border-box',
        }}>
        {messages.length === 0 && !isGenerating && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 0', gap: 12 }}>
            <div style={{ color: '#D1D5DB' }}>
              <MessageSquarePlus size={28} strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Type to start this thread</p>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Ask anything.</p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'user' ? (
              <div style={{
                maxWidth: '82%',
                padding: '10px 15px',
                borderRadius: 16,
                fontSize: 15,
                lineHeight: 1.6,
                wordBreak: 'break-word',
                background: '#F3F4F6',
                color: '#111827',
              }}>
                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
              </div>
            ) : (
              <div style={{
                maxWidth: '94%',
                fontSize: 15,
                lineHeight: 1.68,
                color: '#111827',
                wordBreak: 'break-word',
              }}>
                {msg.content
                  ? (
                    <div className="md-content">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )
                  : isGenerating
                    ? <span style={{ opacity: 0.4 }}>▍</span>
                    : null}
              </div>
            )}
          </div>
        ))}

        {isGenerating && messages[messages.length - 1]?.role === 'user' && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <span style={{ opacity: 0.4, fontSize: 15 }}>▍</span>
          </div>
        )}

        <div ref={bottomRef} />
        </div> {/* centered content */}
      </div> {/* scroll container */}

      {/* Bottom buttons container */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        zIndex: 20,
      }}>
        {showScrollBtn && (
          <Tooltip placement="top" width={90} content="Scroll to bottom">
            <button
              onClick={scrollToBottom}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                transition: 'all 0.15s',
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
              <ArrowDown size={15} strokeWidth={2.5} />
            </button>
          </Tooltip>
        )}

        {showBranchZone && (
          <Tooltip placement="top" width={90} content="Branch new node">
            <button
              onClick={handleBranch}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                transition: 'all 0.15s',
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
              <Plus size={15} strokeWidth={2.5} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

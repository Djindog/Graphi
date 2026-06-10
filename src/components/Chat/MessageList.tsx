import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { MessageSquarePlus, ArrowDown, Plus, Pencil, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useChatStore } from '../../stores/chatStore';
import { useDagStore } from '../../stores/dagStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { Tooltip } from '../Tooltip';
import { BranchReminder } from './BranchReminder';
import type { Message } from '../../types';

function UserMessage({ msg, isLastUser, onEdit }: {
  msg: Message;
  isLastUser: boolean;
  onEdit?: (id: string, content: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = () => {
    setEditContent(msg.content);
    setIsEditing(true);
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }, 0);
  };

  const confirmEdit = () => {
    if (editContent.trim() && onEdit) onEdit(msg.id, editContent.trim());
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditContent(msg.content);
  };

  if (isEditing) {
    return (
      <div style={{ maxWidth: '82%', position: 'relative' }}>
        <div style={{
          padding: '10px 15px', borderRadius: 16,
          fontSize: 15, lineHeight: 1.6,
          background: '#F3F4F6', border: '2px solid #2563EB',
          color: '#111827',
        }}>
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmEdit(); }
              if (e.key === 'Escape') cancelEdit();
            }}
            cols={9999}
            rows={Math.max(2, editContent.split('\n').length)}
            style={{
              padding: 0, borderRadius: 0,
              fontSize: 15, lineHeight: 1.6,
              background: 'transparent', border: 'none',
              color: '#111827', resize: 'none', outline: 'none',
              fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
              minHeight: 44,
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={cancelEdit}
            style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, color: '#6B7280', cursor: 'pointer' }}
          >Cancel</button>
          <button
            onClick={confirmEdit}
            style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#111827', fontSize: 13, color: '#fff', cursor: 'pointer' }}
          >Send</button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 6 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        padding: '10px 15px', borderRadius: 16,
        fontSize: 15, lineHeight: 1.6,
        wordBreak: 'break-word', background: '#F3F4F6', color: '#111827',
      }}>
        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
      </div>
      {isLastUser && onEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <Tooltip placement="top" width={80} content="Edit message">
            <button
              onClick={startEdit}
              style={{
                width: 24, height: 24,
                border: 'none', background: 'transparent',
                color: '#9CA3AF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.15s', padding: 0, marginRight: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#374151'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; }}
            >
              <Pencil size={16} strokeWidth={2} />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ msg, copiedMsgId, onCopy }: {
  msg: Message;
  copiedMsgId: string | null;
  onCopy: (text: string, msgId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '94%' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
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
          : null}
      </div>
      {msg.content && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 4, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <Tooltip placement="top" width={90} content={copiedMsgId === msg.id ? 'Copied!' : 'Copy message'}>
            <button
              onClick={() => onCopy(msg.content, msg.id)}
              style={{
                width: 24, height: 24,
                border: 'none', background: 'transparent',
                color: copiedMsgId === msg.id ? '#10B981' : '#9CA3AF',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.15s', padding: 0, marginLeft: 8,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = copiedMsgId === msg.id ? '#10B981' : '#374151'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = copiedMsgId === msg.id ? '#10B981' : '#9CA3AF'; }}
            >
              {copiedMsgId === msg.id ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2} />}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

interface Props {
  messages: Message[];
  isGenerating: boolean;
  isLoadingMessages?: boolean;
  contextPadding?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onEditMessage?: (id: string, content: string) => void;
  guidancePillVisible?: boolean;
  guidancePillType?: 'length' | 'drift' | 'driftNoNode' | 'noGuidance';
  suggestedNodeTitle?: string;
  suggestedNodeId?: string;
  onMoveToNode?: (nodeId: string) => void;
  onDismissGuidance?: () => void;
  onHoverSuggestedNode?: (nodeId: string | null) => void;
  isOrphan?: boolean;
}

export const MessageList = forwardRef<{ scrollToBottom: () => void }, Props>(({
  messages,
  isGenerating,
  isLoadingMessages = false,
  contextPadding = 0,
  scrollContainerRef,
  onEditMessage,
  guidancePillVisible = false,
  guidancePillType = 'length',
  suggestedNodeTitle,
  suggestedNodeId,
  onMoveToNode,
  onDismissGuidance,
  onHoverSuggestedNode,
  isOrphan = false,
}, ref) => {
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
  }, [messages, guidancePillVisible]);

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

  useImperativeHandle(ref, () => ({ scrollToBottom }), []);

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
    const threshold = guidancePillVisible ? 130 : 50;
    setShowBranchZone(e.clientY >= rect.bottom - threshold);
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
        {isLoadingMessages && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 0', gap: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'gspin 0.75s linear infinite', color: '#9CA3AF' }}>
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Loading messages…</p>
          </div>
        )}

        {messages.length === 0 && !isGenerating && !isLoadingMessages && (
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

        {(() => {
          const lastUserIdx = messages.reduce((acc, m, i) => m.role === 'user' ? i : acc, -1);
          const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
          const copyToClipboard = (text: string, msgId: string) => {
            navigator.clipboard.writeText(text).then(() => {
              setCopiedMsgId(msgId);
              setTimeout(() => setCopiedMsgId(null), 2000);
            });
          };
          return messages.map((msg, idx) => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 8 }}>
            {msg.role === 'user' ? (
              <UserMessage
                msg={msg}
                isLastUser={idx === lastUserIdx && !isGenerating}
                onEdit={onEditMessage}
              />
            ) : (
              <>
                {msg.content || isGenerating ? (
                  <AssistantMessage
                    msg={msg}
                    copiedMsgId={copiedMsgId}
                    onCopy={copyToClipboard}
                  />
                ) : null}
                {isGenerating && !msg.content && (
                  <span style={{ opacity: 0.4, fontSize: 15 }}>▍</span>
                )}
              </>
            )}
          </div>
        ));
        })()}

        {guidancePillVisible && (
          <BranchReminder
            type={guidancePillType}
            isVisible={true}
            suggestedNodeTitle={suggestedNodeTitle}
            suggestedNodeId={suggestedNodeId}
            onMoveToNode={onMoveToNode}
            onDismiss={onDismissGuidance}
            onHoverNode={onHoverSuggestedNode}
          />
        )}

        {isGenerating && messages[messages.length - 1]?.role === 'user' && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}>
            {messages[messages.length - 1]?.content === '' || messages[messages.length - 1]?.content === undefined ? (
              <>
                <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>Thinking…</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'gspin 0.75s linear infinite', color: '#9CA3AF' }}>
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              </>
            ) : (
              <span style={{ opacity: 0.4, fontSize: 15 }}>▍</span>
            )}
          </div>
        )}

        <div ref={bottomRef} />
        </div> {/* centered content */}
      </div> {/* scroll container */}

      {/* Scroll to bottom button - centered at 50% */}
      {showScrollBtn && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
        }}>
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
        </div>
      )}

      {/* Branch new node button */}
      {showBranchZone && !isOrphan && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: showScrollBtn ? 'calc(50% + 35px)' : '50%',
          transform: showScrollBtn ? 'none' : 'translateX(-50%)',
          zIndex: 20,
          paddingTop: 12
        }}>
          <Tooltip placement="top" width={90} content="Branch new node">
            <button
              onClick={handleBranch}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: guidancePillVisible ? '1.5px solid rgb(217, 119, 6)' : '1.5px solid #2563EB',
                background: guidancePillVisible ? 'rgb(254, 243, 199)' : '#F0F9FF',
                color: guidancePillVisible ? 'rgb(120, 53, 15)' : '#2563EB',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.12)';
              }}
            >
              <Plus size={15} strokeWidth={2.5} />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
});

MessageList.displayName = 'MessageList';

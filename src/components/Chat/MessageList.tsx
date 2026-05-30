import { useEffect, useRef } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Message } from '../../types';

interface Props {
  messages: Message[];
  isGenerating: boolean;
  scrollRef?: React.Ref<HTMLDivElement>;
}

export function MessageList({ messages, isGenerating, scrollRef }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      ref={scrollRef ?? internalRef}
      style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}
    >
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
    </div>
  );
}

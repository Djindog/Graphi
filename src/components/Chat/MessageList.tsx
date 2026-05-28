import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Message } from '../../types';

interface Props {
  messages: Message[];
  isGenerating: boolean;
  // Optional: outer scroll container ref (provided by SwipeContainer)
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
      style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {messages.length === 0 && !isGenerating && (
        <p style={{ color: '#D1D5DB', fontSize: 15, textAlign: 'center', marginTop: 40 }}>
          Type to start this thread…
        </p>
      )}

      {messages.map(msg => (
        <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
          <div
            style={{
              maxWidth: '88%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
              fontSize: 15,
              lineHeight: 1.65,
              wordBreak: 'break-word',
              background: msg.role === 'user' ? '#111827' : '#F9FAFB',
              color: msg.role === 'user' ? '#fff' : '#111827',
              border: msg.role === 'assistant' ? '1px solid #F3F4F6' : 'none',
            }}
          >
            {msg.role === 'assistant' ? (
              msg.content
                ? (
                  <div className="md-content">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )
                : isGenerating
                  ? <span style={{ opacity: 0.4 }}>▍</span>
                  : null
            ) : (
              <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
            )}
          </div>
        </div>
      ))}

      {isGenerating && messages[messages.length - 1]?.role === 'user' && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ padding: '10px 14px', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '4px 14px 14px 14px' }}>
            <span style={{ color: '#9CA3AF', fontSize: 15 }}>▍</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

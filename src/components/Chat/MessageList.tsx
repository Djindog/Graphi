import { useEffect, useRef } from 'react';
import type { Message } from '../../types';

interface Props {
  messages: Message[];
  isGenerating: boolean;
}

export function MessageList({ messages, isGenerating }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {messages.length === 0 && !isGenerating && (
        <p style={{ color: '#D1D5DB', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
          Type to start this thread…
        </p>
      )}

      {messages.map(msg => (
        <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
          <div
            style={{
              maxWidth: '88%',
              padding: '9px 13px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
              fontSize: 14,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: msg.role === 'user' ? '#111827' : '#F9FAFB',
              color: msg.role === 'user' ? '#fff' : '#111827',
              border: msg.role === 'assistant' ? '1px solid #F3F4F6' : 'none',
            }}
          >
            {msg.content || (msg.role === 'assistant' && isGenerating
              ? <span style={{ opacity: 0.4 }}>▍</span>
              : null)}
          </div>
        </div>
      ))}

      {isGenerating && messages[messages.length - 1]?.role === 'user' && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ padding: '9px 13px', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '4px 14px 14px 14px' }}>
            <span style={{ color: '#9CA3AF', fontSize: 14 }}>▍</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
